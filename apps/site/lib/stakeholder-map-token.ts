import { createHmac } from 'crypto'

const TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hour

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

/**
 * Creates a short-lived token for the stakeholder-map app.
 * Token encodes userId; the app verifies it and uses it when submitting.
 * Requires STAKEHOLDER_MAP_TOKEN_SECRET (same value in site and stakeholder-map app).
 */
export function createStakeholderMapToken(userId: string): string | null {
  const secret = process.env.STAKEHOLDER_MAP_TOKEN_SECRET
  if (!secret) return null
  const payload = JSON.stringify({
    userId,
    exp: Date.now() + TOKEN_EXPIRY_MS,
  })
  const payloadB64 = base64UrlEncode(payload)
  const sig = createHmac('sha256', secret).update(payloadB64).digest('base64url')
  return `${payloadB64}.${sig}`
}
