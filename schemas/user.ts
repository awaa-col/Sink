import { z } from 'zod'

export const UserRoleSchema = z.enum(['admin', 'user'])

export const UserSchema = z.object({
  id: z.string().trim().max(256),
  email: z.string().trim().email().max(256),
  name: z.string().trim().max(256).optional(),
  avatar: z.string().trim().url().max(2048).optional(),
  role: UserRoleSchema.default('user'),
  createdAt: z.number().int().safe().default(() => Math.floor(Date.now() / 1000)),
  lastLogin: z.number().int().safe().default(() => Math.floor(Date.now() / 1000)),
})

export type User = z.infer<typeof UserSchema>
export type UserRole = z.infer<typeof UserRoleSchema>
