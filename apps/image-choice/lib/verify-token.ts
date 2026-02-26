import { createHmac } from 'crypto'

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

/**
 * Verifies the token from the site (dashboard) and returns the userId, or null if invalid/expired.
 * Requires IMAGE_CHOICE_TOKEN_SECRET to match the site's value.
 */
export function verifyImageChoiceToken(token: string): string | null {
  const secret = process.env.IMAGE_CHOICE_TOKEN_SECRET
  if (!secret) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payloadB64, sig] = parts
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
