import { createHmac } from 'crypto'

const TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hour

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

/**
 * Creates a short-lived token encoding the user id for the audience-poker app.
 * Audience-poker uses this when submitting to associate the submission with the user.
 * Requires AUDIENCE_POKER_TOKEN_SECRET to be set (same value in site and audience-poker apps).
 */
export function createAudiencePokerToken(userId: string): string | null {
  const secret = process.env.AUDIENCE_POKER_TOKEN_SECRET
  if (!secret) return null
  const payload = JSON.stringify({
    userId,
    exp: Date.now() + TOKEN_EXPIRY_MS,
  })
  const payloadB64 = base64UrlEncode(payload)
  const sig = createHmac('sha256', secret).update(payloadB64).digest('base64url')
  return `${payloadB64}.${sig}`
}
