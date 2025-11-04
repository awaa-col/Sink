import { extractToken, verifyToken } from '../utils/jwt'
import { getUserById } from '../utils/user'

export default eventHandler(async (event) => {
  // Skip auth for public routes
  if (!event.path.startsWith('/api/') || event.path.startsWith('/api/_') || event.path.startsWith('/api/auth/')) {
    return
  }

  const authHeader = getHeader(event, 'Authorization')
  const token = extractToken(authHeader)

  if (!token) {
    throw createError({
      status: 401,
      statusText: 'Unauthorized',
      message: 'No authentication token provided',
    })
  }

  const { siteToken, jwtSecret } = useRuntimeConfig(event)

  // Check if it's the legacy site token
  if (token === siteToken) {
    // Legacy token authentication - create a system user context
    event.context.user = {
      id: 'system',
      email: 'system@sink.local',
      role: 'admin',
    }
    return
  }

  // Try JWT authentication
  const payload = await verifyToken(token, jwtSecret)

  if (!payload) {
    throw createError({
      status: 401,
      statusText: 'Unauthorized',
      message: 'Invalid or expired token',
    })
  }

  // Get full user details from KV
  const { cloudflare } = event.context
  if (cloudflare?.env?.KV) {
    const { KV } = cloudflare.env
    const user = await getUserById(KV, payload.id as string)

    if (!user) {
      throw createError({
        status: 401,
        statusText: 'Unauthorized',
        message: 'User not found',
      })
    }

    event.context.user = user
  }
  else {
    // Fallback to payload data if KV is not available
    event.context.user = {
      id: payload.id as string,
      email: payload.email as string,
      role: payload.role as 'admin' | 'user',
    }
  }
})
