import type { LinkSchema } from '@@/schemas/link'
import type { User } from '@@/schemas/user'
import type { z } from 'zod'
import { getCurrentDate } from '../../../utils/quota'

/**
 * Admin overview statistics endpoint
 * Note: This endpoint may consume significant KV quota with many users/links
 * Consider caching or pre-computing statistics for production use
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
  const today = getCurrentDate()
  const todayTimestamp = Math.floor(new Date(today).getTime() / 1000)

  // Count total users
  const usersList = await KV.list({ prefix: 'user:' })
  const totalUsers = usersList.keys.length

  // Count today's active users
  let todayActiveUsers = 0
  for (const key of usersList.keys) {
    const user = await KV.get(key.name, { type: 'json' }) as User | null
    if (user && user.lastLogin >= todayTimestamp) {
      todayActiveUsers++
    }
  }

  // Count total links and today's new links
  const linksList = await KV.list({ prefix: 'link:' })
  const totalLinks = linksList.keys.length
  let todayNewLinks = 0

  for (const key of linksList.keys) {
    const link = await KV.get(key.name, { type: 'json' }) as z.infer<typeof LinkSchema> | null
    if (link && link.createdAt >= todayTimestamp) {
      todayNewLinks++
    }
  }

  return {
    totalUsers,
    totalLinks,
    todayActiveUsers,
    todayNewLinks,
  }
})
