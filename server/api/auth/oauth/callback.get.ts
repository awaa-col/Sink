import { UserSchema } from '@@/schemas/user'
import { generateToken } from '../../../utils/jwt'
import { getUserByEmail, isAdmin, saveUser } from '../../../utils/user'

interface GitHubUser {
  id: number
  email: string
  name?: string
  avatar_url?: string
  login: string
}

interface GitHubEmail {
  email: string
  primary: boolean
  verified: boolean
}

/**
 * OAuth Callback endpoint - handles GitHub OAuth callback
 */
export default eventHandler(async (event) => {
  const { githubClientId, githubClientSecret, adminEmails, jwtSecret } = useRuntimeConfig(event)
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
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: githubClientId,
        client_secret: githubClientSecret,
        code,
      }),
    })

    const tokenData = await tokenResponse.json() as { access_token?: string, error?: string }

    if (tokenData.error || !tokenData.access_token) {
      throw new Error(tokenData.error || 'Failed to get access token')
    }

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
        'User-Agent': 'Sink-URL-Shortener',
      },
    })

    const githubUser = await userResponse.json() as GitHubUser

    // Get user email if not present in user data
    let email = githubUser.email
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json',
          'User-Agent': 'Sink-URL-Shortener',
        },
      })
      const emails = await emailsResponse.json() as GitHubEmail[]
      const primaryEmail = emails.find(e => e.primary && e.verified)
      email = primaryEmail?.email || emails[0]?.email
    }

    if (!email) {
      throw new Error('Failed to get user email from GitHub')
    }

    const { cloudflare } = event.context
    if (!cloudflare?.env?.KV) {
      throw new Error('KV storage not available')
    }

    const { KV } = cloudflare.env

    // Check if user exists
    let user = await getUserByEmail(KV, email)

    const userId = `github:${githubUser.id}`

    if (!user) {
      // Create new user
      user = UserSchema.parse({
        id: userId,
        email,
        name: githubUser.name || githubUser.login,
        avatar: githubUser.avatar_url,
        role: isAdmin({ email } as any, adminEmails) ? 'admin' : 'user',
        createdAt: Math.floor(Date.now() / 1000),
        lastLogin: Math.floor(Date.now() / 1000),
      })
    }
    else {
      // Update existing user
      user.lastLogin = Math.floor(Date.now() / 1000)
      user.name = githubUser.name || githubUser.login || user.name
      user.avatar = githubUser.avatar_url || user.avatar
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
