import { getCurrentDate, getQuota, isQuotaExceeded } from '../utils/quota'

/**
 * Quota check middleware - runs first to prevent operations when quota is exceeded
 * This middleware checks if daily KV quota limits have been exceeded
 */
export default eventHandler(async (event) => {
  const { quotaEnabled, quotaDailyReads, quotaDailyWrites } = useRuntimeConfig(event)

  // Skip quota check if disabled or for non-API routes
  if (quotaEnabled !== 'true' || !event.path.startsWith('/api/')) {
    return
  }

  // Skip quota check for read-only endpoints that don't modify data
  const isReadOnly = event.method === 'GET' && (
    event.path.startsWith('/api/auth/')
    || event.path.startsWith('/api/stats/')
    || event.path.startsWith('/api/admin/')
  )

  if (isReadOnly) {
    return
  }

  const { cloudflare } = event.context
  if (!cloudflare?.env?.KV) {
    return
  }

  const { KV } = cloudflare.env
  const date = getCurrentDate()
  const quota = await getQuota(KV, date)

  const dailyReads = Number(quotaDailyReads)
  const dailyWrites = Number(quotaDailyWrites)

  const { exceeded, reason } = isQuotaExceeded(quota, dailyReads, dailyWrites)

  if (exceeded) {
    throw createError({
      status: 429,
      statusText: 'Too Many Requests',
      message: reason || 'Daily quota exceeded',
    })
  }
})
