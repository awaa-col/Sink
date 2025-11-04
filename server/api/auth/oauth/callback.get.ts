import { UserSchema } from '@@/schemas/user'
import { generateToken } from '../../../utils/jwt'
import { getUserByEmail, isAdmin, saveUser } from '../../../utils/user'

interface OAuthUser {
  id: number | string
  email?: string
  name?: string
  username?: string
  avatar_url?: string
  avatar?: string
  login?: string
}

interface OAuthEmail {
  email: string
  primary: boolean
  verified: boolean
}

/**
 * OAuth Callback endpoint - handles OAuth callback from GitHub or custom providers
 */
export default eventHandler(async (event) => {
  const {
    oauthProvider,
    oauthClientId,
    oauthClientSecret,
    oauthTokenUrl,
    oauthUserUrl,
    adminEmails,
    jwtSecret,
  } = useRuntimeConfig(event)

  const { code, state } = getQuery(event)

  // Verify state parameter
  const storedState = getCookie(event, 'oauth_state')
  if (!state || state !== storedState) {
    throw createError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Invalid state parameter',
    })
  }

  // Clear state cookie
  deleteCookie(event, 'oauth_state')

  if (!code) {
    throw createError({
      status: 400,
      statusText: 'Bad Request',
      message: 'No authorization code provided',
    })
  }

  try {
    // Determine OAuth endpoints based on provider
    let tokenEndpoint: string
    let userEndpoint: string

    if (oauthProvider === 'github') {
      tokenEndpoint = 'https://github.com/login/oauth/access_token'
      userEndpoint = 'https://api.github.com/user'
    }
    else {
      // Custom OAuth provider
      if (!oauthTokenUrl || !oauthUserUrl) {
        throw new Error('Custom OAuth provider endpoints not configured')
      }
      tokenEndpoint = oauthTokenUrl
      userEndpoint = oauthUserUrl
    }

    // Exchange code for access token
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: oauthClientId,
        client_secret: oauthClientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenResponse.json() as { access_token?: string, error?: string }

    if (tokenData.error || !tokenData.access_token) {
      throw new Error(tokenData.error || 'Failed to get access token')
    }

    // Get user info from OAuth provider
    const userResponse = await fetch(userEndpoint, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
        'User-Agent': 'Sink-URL-Shortener',
      },
    })

    const oauthUser = await userResponse.json() as OAuthUser

    // Extract user information
    let email = oauthUser.email
    const name = oauthUser.name || oauthUser.username || oauthUser.login || ''
    const avatar = oauthUser.avatar_url || oauthUser.avatar || ''

    // For GitHub, try to get email from separate endpoint if not present
    if (oauthProvider === 'github' && !email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json',
          'User-Agent': 'Sink-URL-Shortener',
        },
      })
      const emails = await emailsResponse.json() as OAuthEmail[]
      const primaryEmail = emails.find(e => e.primary && e.verified)
      email = primaryEmail?.email || emails[0]?.email
    }

    if (!email) {
      throw new Error(`Failed to get user email from ${oauthProvider}`)
    }

    const { cloudflare } = event.context
    if (!cloudflare?.env?.KV) {
      throw new Error('KV storage not available')
    }

    const { KV } = cloudflare.env

    // Check if user exists
    let user = await getUserByEmail(KV, email)

    const userId = `${oauthProvider}:${oauthUser.id}`

    if (!user) {
      // Create new user
      user = UserSchema.parse({
        id: userId,
        email,
        name,
        avatar,
        role: isAdmin({ email } as any, adminEmails) ? 'admin' : 'user',
        createdAt: Math.floor(Date.now() / 1000),
        lastLogin: Math.floor(Date.now() / 1000),
      })
    }
    else {
      // Update existing user
      user.lastLogin = Math.floor(Date.now() / 1000)
      user.name = name || user.name
      user.avatar = avatar || user.avatar
      // Update role based on admin emails
      user.role = isAdmin(user, adminEmails) ? 'admin' : 'user'
    }

    // Save user to KV
    await saveUser(KV, user)

    // Generate JWT token
    const token = await generateToken(user, jwtSecret)

    // Redirect to callback page with token
    const redirectUrl = new URL('/dashboard/oauth/callback', getRequestURL(event))
    redirectUrl.searchParams.set('token', token)

    return sendRedirect(event, redirectUrl.toString())
  }
  catch (error: any) {
    console.error('OAuth callback error:', error)
    throw createError({
      status: 500,
      statusText: 'Internal Server Error',
      message: error.message || 'OAuth authentication failed',
    })
  }
})
