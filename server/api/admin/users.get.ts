import type { User } from '@@/schemas/user'
import { z } from 'zod'

/**
 * Admin users list endpoint
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

  const { limit, cursor } = await getValidatedQuery(event, z.object({
    limit: z.coerce.number().max(100).default(20),
    cursor: z.string().trim().max(1024).optional(),
  }).parse)

  const list = await KV.list({
    prefix: 'user:',
    limit,
    cursor: cursor || undefined,
  })

  const users = await Promise.all(list.keys.map(async (key) => {
    const user = await KV.get(key.name, { type: 'json' }) as User | null
    return user
  }))

  return {
    users: users.filter(Boolean),
    list_complete: list.list_complete,
    cursor: list.cursor,
  }
})
