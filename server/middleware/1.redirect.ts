import type { LinkSchema } from '@@/schemas/link'
import type { z } from 'zod'
import { parsePath, withQuery } from 'ufo'
import { getCurrentDate } from '../utils/quota'

export default eventHandler(async (event) => {
  const { pathname: slug } = parsePath(event.path.replace(/^\/|\/$/g, '')) // remove leading and trailing slashes
  const { slugRegex, reserveSlug } = useAppConfig(event)
  const { homeURL, linkCacheTtl, redirectWithQuery, caseSensitive } = useRuntimeConfig(event)
  const { cloudflare } = event.context

  if (event.path === '/' && homeURL)
    return sendRedirect(event, homeURL)

  if (slug && !reserveSlug.includes(slug) && slugRegex.test(slug) && cloudflare) {
    const { KV } = cloudflare.env

    let link: z.infer<typeof LinkSchema> | null = null

    const getLink = async (key: string) =>
      await KV.get(`link:${key}`, { type: 'json', cacheTtl: linkCacheTtl })

    const lowerCaseSlug = slug.toLowerCase()
    link = await getLink(caseSensitive ? slug : lowerCaseSlug)

    // fallback to original slug if caseSensitive is false and the slug is not found
    if (!caseSensitive && !link && lowerCaseSlug !== slug) {
      console.log('original slug fallback:', `slug:${slug} lowerCaseSlug:${lowerCaseSlug}`)
      link = await getLink(slug)
    }

    if (link) {
      event.context.link = link

      // Update link statistics
      try {
        const today = getCurrentDate()
        if (!link.stats) {
          link.stats = { totalClicks: 0, todayClicks: 0, lastClickDate: today }
        }

        // Reset today's clicks if it's a new day
        if (link.stats.lastClickDate !== today) {
          link.stats.todayClicks = 0
          link.stats.lastClickDate = today
        }

        // Increment counters
        link.stats.totalClicks += 1
        link.stats.todayClicks += 1

        // Update link in KV with new stats (fire and forget)
        const expiration = getExpiration(event, link.expiration)
        KV.put(`link:${caseSensitive ? slug : lowerCaseSlug}`, JSON.stringify(link), {
          expiration,
          metadata: {
            expiration,
            url: link.url,
            comment: link.comment,
          },
        }).catch((error) => {
          console.error('Failed to update link stats:', error)
        })
      }
      catch (error) {
        console.error('Failed to update link stats:', error)
      }

      // Log access
      try {
        await useAccessLog(event)
      }
      catch (error) {
        console.error('Failed write access log:', error)
      }

      const target = redirectWithQuery ? withQuery(link.url, getQuery(event)) : link.url
      return sendRedirect(event, target, +useRuntimeConfig(event).redirectStatusCode)
    }
  }
})
