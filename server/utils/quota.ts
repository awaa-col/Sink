import type { Quota } from '@@/schemas/quota'
import type { KVNamespace } from '@cloudflare/workers-types'

/**
 * Get current date in YYYY-MM-DD format (UTC)
 */
export function getCurrentDate(): string {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

/**
 * Get quota for a specific date
 */
export async function getQuota(KV: KVNamespace, date: string): Promise<Quota> {
  const quota = await KV.get(`quota:${date}`, { type: 'json' }) as Quota | null
  return quota || { reads: 0, writes: 0, date }
}

/**
 * Update quota counters
 */
export async function updateQuota(
  KV: KVNamespace,
  date: string,
  reads: number = 0,
  writes: number = 0,
): Promise<Quota> {
  const quota = await getQuota(KV, date)
  quota.reads += reads
  quota.writes += writes

  await KV.put(`quota:${date}`, JSON.stringify(quota), {
    expirationTtl: 86400 * 2, // Keep for 2 days
  })

  return quota
}

/**
 * Check if quota limits are exceeded
 */
export function isQuotaExceeded(
  quota: Quota,
  dailyReads: number,
  dailyWrites: number,
): { exceeded: boolean, reason?: string } {
  if (quota.reads >= dailyReads) {
    return { exceeded: true, reason: 'Daily read quota exceeded' }
  }
  if (quota.writes >= dailyWrites) {
    return { exceeded: true, reason: 'Daily write quota exceeded' }
  }
  return { exceeded: false }
}

/**
 * Track a read operation
 */
export async function trackRead(KV: KVNamespace): Promise<void> {
  const date = getCurrentDate()
  await updateQuota(KV, date, 1, 0)
}

/**
 * Track a write operation
 */
export async function trackWrite(KV: KVNamespace): Promise<void> {
  const date = getCurrentDate()
  await updateQuota(KV, date, 0, 1)
}
