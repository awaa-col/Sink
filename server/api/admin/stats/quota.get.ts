import type { User } from '@@/schemas/user'
import { getCurrentDate, getQuota } from '../../../utils/quota'

/**
 * Admin quota usage statistics endpoint
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

  const { quotaEnabled, quotaDailyReads, quotaDailyWrites } = useRuntimeConfig(event)
  const { KV } = cloudflare.env

  const date = getCurrentDate()
  const quota = await getQuota(KV, date)

  const dailyReads = Number.parseInt(quotaDailyReads)
  const dailyWrites = Number.parseInt(quotaDailyWrites)

  return {
    enabled: quotaEnabled === 'true',
    date,
    reads: {
      used: quota.reads,
      limit: dailyReads,
      percentage: Math.round((quota.reads / dailyReads) * 100),
    },
    writes: {
      used: quota.writes,
      limit: dailyWrites,
      percentage: Math.round((quota.writes / dailyWrites) * 100),
    },
  }
})
