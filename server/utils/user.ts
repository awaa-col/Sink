import type { User } from '@@/schemas/user'
import type { KVNamespace } from '@cloudflare/workers-types'

/**
 * Get user by ID from KV
 */
export async function getUserById(KV: KVNamespace, userId: string): Promise<User | null> {
  const user = await KV.get(`user:${userId}`, { type: 'json' }) as User | null
  return user
}

/**
 * Get user by email from KV
 */
export async function getUserByEmail(KV: KVNamespace, email: string): Promise<User | null> {
  // List all users and find by email
  const list = await KV.list({ prefix: 'user:' })
  for (const key of list.keys) {
    const user = await KV.get(key.name, { type: 'json' }) as User | null
    if (user && user.email === email) {
      return user
    }
  }
  return null
}

/**
 * Save or update user in KV
 */
export async function saveUser(KV: KVNamespace, user: User): Promise<void> {
  await KV.put(`user:${user.id}`, JSON.stringify(user))
}

/**
 * Check if user is admin based on config
 */
export function isAdmin(user: User, adminEmails: string): boolean {
  if (!adminEmails)
    return false
  const emails = adminEmails.split(',').map(e => e.trim().toLowerCase())
  return emails.includes(user.email.toLowerCase())
}

/**
 * Update user's last login time
 */
export async function updateLastLogin(KV: KVNamespace, userId: string): Promise<void> {
  const user = await getUserById(KV, userId)
  if (user) {
    user.lastLogin = Math.floor(Date.now() / 1000)
    await saveUser(KV, user)
  }
}
