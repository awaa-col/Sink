import type { LinkSchema } from '@@/schemas/link'
import type { User } from '@@/schemas/user'
import type { z } from 'zod'

/**
 * Admin domain statistics endpoint - shows top domains by link count
 * Note: This endpoint fetches all links and may consume significant KV quota
 * Consider pre-computing domain stats for production use with many links
 */
export default eventHandler(async (event) => {
  const user = event.context.user as User

  if (!user || user.role !== 'admin') {
    throw createError({
      status: 403,
      statusText: 'Forbidden',
      message: 'Admin access required',
    })
  }

  const { cloudflare } = event.context
  if (!cloudflare?.env?.KV) {
    throw createError({
      status: 500,
      statusText: 'Internal Server Error',
      message: 'KV storage not available',
    })
  }

  const { KV } = cloudflare.env

  // Get all links and count by domain
  const linksList = await KV.list({ prefix: 'link:' })
  const domainCounts = new Map<string, number>()

  for (const key of linksList.keys) {
    const link = await KV.get(key.name, { type: 'json' }) as z.infer<typeof LinkSchema> | null
    if (link && link.url) {
      try {
        const url = new URL(link.url)
        const domain = url.hostname
        domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1)
      }
      catch (error) {
        // Skip invalid URLs
        console.error('Invalid URL in link:', link.url, error)
      }
    }
  }

  // Convert to array and sort by count
  const domains = Array.from(domainCounts.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50) // Top 50

  return {
    domains,
    total: domains.length,
  }
})
