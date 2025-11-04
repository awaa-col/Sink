import { z } from 'zod'

export const LinkStatsSchema = z.object({
  totalClicks: z.number().int().min(0).default(0),
  todayClicks: z.number().int().min(0).default(0),
  lastClickDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
})

export const DomainStatSchema = z.object({
  domain: z.string(),
  count: z.number().int().min(0),
})

export const OverviewStatsSchema = z.object({
  totalUsers: z.number().int().min(0),
  totalLinks: z.number().int().min(0),
  todayActiveUsers: z.number().int().min(0),
  todayNewLinks: z.number().int().min(0),
})

export type LinkStats = z.infer<typeof LinkStatsSchema>
export type DomainStat = z.infer<typeof DomainStatSchema>
export type OverviewStats = z.infer<typeof OverviewStatsSchema>
