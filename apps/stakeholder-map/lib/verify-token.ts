import { createHmac } from 'crypto'

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

export function verifyStakeholderMapToken(token: string): string | null {
  const secret = process.env.STAKEHOLDER_MAP_TOKEN_SECRET
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
