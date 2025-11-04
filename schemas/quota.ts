import { z } from 'zod'

export const QuotaSchema = z.object({
  reads: z.number().int().min(0).default(0),
  writes: z.number().int().min(0).default(0),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
})

export type Quota = z.infer<typeof QuotaSchema>
