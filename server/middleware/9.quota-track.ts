import { trackRead, trackWrite } from '../utils/quota'

/**
 * Quota tracking middleware - tracks KV operations for quota management
 * This runs after operations complete to record usage
 */
export default eventHandler(async (event) => {
  const { quotaEnabled } = useRuntimeConfig(event)

  // Skip if quota is disabled or not an API route
  if (quotaEnabled !== 'true' || !event.path.startsWith('/api/')) {
    return
  }

  const { cloudflare } = event.context
  if (!cloudflare?.env?.KV) {
    return
  }

  const { KV } = cloudflare.env

  // Track operations based on HTTP method
  try {
    if (event.method === 'GET' || event.method === 'HEAD') {
      // Read operations
      await trackRead(KV)
    }
    else if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.method)) {
      // Write operations
      await trackWrite(KV)
    }
  }
  catch (error) {
    // Don't fail the request if quota tracking fails
    console.error('Failed to track quota:', error)
  }
})
