/**
 * OAuth Authorization endpoint - redirects to OAuth provider
 * Supports GitHub and custom OAuth providers (e.g., linux.do)
 */
export default eventHandler((event) => {
  const {
    oauthProvider,
    oauthClientId,
    oauthRedirectUri,
    oauthAuthorizeUrl,
    oauthScope,
  } = useRuntimeConfig(event)

  if (!oauthClientId || !oauthRedirectUri) {
    throw createError({
      status: 500,
      statusText: 'Internal Server Error',
      message: 'OAuth is not configured',
    })
  }

  // Generate random state for CSRF protection
  const state = crypto.randomUUID()

  // Store state in cookie for verification
  setCookie(event, 'oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  })

  // Build OAuth URL based on provider
  let authUrl: URL
  let scope: string

  if (oauthProvider === 'github') {
    authUrl = new URL('https://github.com/login/oauth/authorize')
    scope = 'user:email read:user'
  }
  else {
    // Custom OAuth provider (e.g., linux.do)
    if (!oauthAuthorizeUrl) {
      throw createError({
        status: 500,
        statusText: 'Internal Server Error',
        message: 'Custom OAuth provider authorize URL not configured',
      })
    }
    authUrl = new URL(oauthAuthorizeUrl)
    scope = oauthScope || 'read'
  }

  authUrl.searchParams.set('client_id', oauthClientId)
  authUrl.searchParams.set('redirect_uri', oauthRedirectUri)
  authUrl.searchParams.set('scope', scope)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('response_type', 'code')

  return sendRedirect(event, authUrl.toString())
})
