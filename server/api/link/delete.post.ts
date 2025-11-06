import type { LinkSchema } from '@@/schemas/link'
import type { User } from '@@/schemas/user'
import type { z } from 'zod'

export default eventHandler(async (event) => {
  const { previewMode } = useRuntimeConfig(event).public
  if (previewMode) {
    throw createError({
      status: 403,
      statusText: 'Preview mode cannot delete links.',
    })
  }
  const { slug } = await readBody(event)
  if (slug) {
    const { cloudflare } = event.context
    const { KV } = cloudflare.env
    const user = event.context.user as User | undefined

    // Check ownership (non-admin users can only delete their own links)
    if (user && user.role !== 'admin') {
      const existingLink: z.infer<typeof LinkSchema> | null = await KV.get(`link:${slug}`, { type: 'json' })
      if (existingLink && existingLink.userId !== user.id) {
        throw createError({
          status: 403,
          statusText: 'Forbidden',
          message: 'You can only delete your own links',
        })
      }
    }

    await KV.delete(`link:${slug}`)
  }
})
