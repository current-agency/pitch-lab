import { createHmac } from 'crypto'

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

/**
 * Shared secret for activity link tokens. Set ACTIVITY_LINK_SECRET in the site, CMS,
 * and any standalone activity app that verifies link tokens.
 */
const getSecret = (): string | undefined => process.env.ACTIVITY_LINK_SECRET

/**
 * Verifies the token and returns the userId, or null if invalid/expired.
 * Used by standalone activity apps (image-choice, audience-poker, stakeholder-map)
 * when opened via a link that includes the token.
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
