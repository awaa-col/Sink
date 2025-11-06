import type { User } from '@@/schemas/user'
import * as jose from 'jose'

/**
 * Generate a JWT token for a user
 * @param user User object
 * @param secret JWT secret key
 * @returns JWT token string
 */
export async function generateToken(user: User, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const secretKey = encoder.encode(secret)

  const token = await new jose.SignJWT({
    id: user.id,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d') // Token expires in 30 days
    .sign(secretKey)

  return token
}

/**
 * Verify and decode a JWT token
 * @param token JWT token string
 * @param secret JWT secret key
 * @returns Decoded payload or null if invalid
 */
export async function verifyToken(token: string, secret: string): Promise<jose.JWTPayload | null> {
  try {
    const encoder = new TextEncoder()
    const secretKey = encoder.encode(secret)

    const { payload } = await jose.jwtVerify(token, secretKey)
    return payload
  }
  catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}

/**
 * Extract JWT token from Authorization header
 * @param header Authorization header value
 * @returns Token string or null
 */
export function extractToken(header: string | undefined): string | null {
  if (!header)
    return null

  const match = header.match(/^Bearer\s+(\S+)$/i)
  return match ? match[1] : null
}
