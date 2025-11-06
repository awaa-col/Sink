import type { User } from '@@/schemas/user'
import { z } from 'zod'

export default eventHandler(async (event) => {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  const user = event.context.user as User | undefined

  const { limit, cursor } = await getValidatedQuery(event, z.object({
    limit: z.coerce.number().max(1024).default(20),
    cursor: z.string().trim().max(1024).optional(),
  }).parse)

  const list = await KV.list({
    prefix: `link:`,
    limit,
    cursor: cursor || undefined,
  })

  if (Array.isArray(list.keys)) {
    list.links = await Promise.all(list.keys.map(async (key: { name: string }) => {
      const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' })
      if (link) {
        // Filter links by user ownership (non-admin users only see their own links)
        if (user && user.role !== 'admin' && link.userId !== user.id) {
          return null
        }

        return {
          ...metadata,
          ...link,
        }
      }
      return link
    }))

    // Remove null entries (filtered out links)
    list.links = list.links.filter(Boolean)
  }
  delete list.keys
  return list
})
