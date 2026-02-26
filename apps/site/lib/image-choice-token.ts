import { createHmac } from 'crypto'

const TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hour

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

/**
 * Creates a short-lived token encoding the user id for the image-choice app.
 * Image-choice uses this when saving responses to associate them with the user.
 * Requires IMAGE_CHOICE_TOKEN_SECRET to be set (same value in site and image-choice apps).
 */
export function createImageChoiceToken(userId: string): string | null {
  const secret = process.env.IMAGE_CHOICE_TOKEN_SECRET
  if (!secret) return null
  const payload = JSON.stringify({
    userId,
    exp: Date.now() + TOKEN_EXPIRY_MS,
  })
  const payloadB64 = base64UrlEncode(payload)
  const sig = createHmac('sha256', secret).update(payloadB64).digest('base64url')
  return `${payloadB64}.${sig}`
}

/**
 * Verifies the token and returns the userId, or null if invalid/expired.
 * Used by the image-choice app API.
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
