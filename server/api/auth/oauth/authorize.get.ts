/**
 * OAuth Authorization endpoint - redirects to GitHub OAuth
 */
export default eventHandler((event) => {
  const { githubClientId, githubRedirectUri } = useRuntimeConfig(event)

  if (!githubClientId || !githubRedirectUri) {
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

  // Build GitHub OAuth URL
  const authUrl = new URL('https://github.com/login/oauth/authorize')
  authUrl.searchParams.set('client_id', githubClientId)
  authUrl.searchParams.set('redirect_uri', githubRedirectUri)
  authUrl.searchParams.set('scope', 'user:email read:user')
  authUrl.searchParams.set('state', state)

  return sendRedirect(event, authUrl.toString())
})
