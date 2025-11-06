import type { User } from '@@/schemas/user'

export default eventHandler(async (event) => {
  const slug = getQuery(event).slug
  if (slug) {
    const { cloudflare } = event.context
    const { KV } = cloudflare.env
    const user = event.context.user as User | undefined

    const { metadata, value: link } = await KV.getWithMetadata(`link:${slug}`, { type: 'json' })
    if (link) {
      // Check ownership (non-admin users can only query their own links)
      if (user && user.role !== 'admin' && link.userId && link.userId !== user.id) {
        throw createError({
          status: 403,
          statusText: 'Forbidden',
          message: 'You can only view your own links',
        })
      }

      return {
        ...metadata,
        ...link,
      }
    }
  }
  throw createError({
    status: 404,
    statusText: 'Not Found',
  })
})
