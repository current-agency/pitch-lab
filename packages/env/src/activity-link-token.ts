import { createHmac } from 'crypto'

const DEFAULT_EXPIRY_MS = 60 * 60 * 1000 // 1 hour

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

/**
 * Single shared secret for all activity links (image-choice, audience-poker, stakeholder-map).
 * Set ACTIVITY_LINK_SECRET to the same value in the site and in each activity app.
 */
const getSecret = (): string | undefined => process.env.ACTIVITY_LINK_SECRET

/**
 * Creates a short-lived token encoding the user id for activity app links.
 * Use this when building dashboard links; each app verifies with verifyActivityLinkToken.
 */
export function createActivityLinkToken(
  userId: string,
  options?: { expiresInMs?: number },
): string | null {
  const secret = getSecret()
  if (!secret) return null
  const expiresInMs = options?.expiresInMs ?? DEFAULT_EXPIRY_MS
  const payload = JSON.stringify({
    userId,
    exp: Date.now() + expiresInMs,
  })
  const payloadB64 = base64UrlEncode(payload)
  const sig = createHmac('sha256', secret).update(payloadB64).digest('base64url')
  return `${payloadB64}.${sig}`
}

/**
 * Verifies the token and returns the userId, or null if invalid/expired.
 * Use in activity app API routes (image-choice, audience-poker, stakeholder-map).
 */
export function verifyActivityLinkToken(token: string): string | null {
  const secret = getSecret()
  if (!secret) return null
  const parts = token.split('.')
  const payloadB64 = parts[0]
  const sig = parts[1]
  if (parts.length !== 2 || !payloadB64 || !sig) return null
  const expectedSig = createHmac('sha256', secret).update(payloadB64).digest('base64url')
  if (sig !== expectedSig) return null
  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as { userId?: string; exp?: number }
    if (!payload.userId || typeof payload.exp !== 'number' || payload.exp < Date.now()) return null
    return payload.userId
  } catch {
    return null
  }
}
