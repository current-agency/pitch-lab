/**
 * Simple in-memory rate limiter by key (e.g. IP address).
 * Use for login and change-password to reduce brute-force risk.
 * Note: In serverless (e.g. Vercel), limits are per-instance; for strict limits use Redis (e.g. Upstash).
 */

type Entry = { count: number; resetAt: number }

const store = new Map<string, Entry>()

/** Clean old entries to avoid unbounded growth. */
function prune(now: number): void {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) store.delete(key)
  }
}

/**
 * Returns true if the key is within the limit, false if rate limited.
 * Call this at the start of the handler; if it returns false, return 429.
 */
export function checkRateLimit(
  key: string,
  options: { maxAttempts: number; windowMs: number },
): boolean {
  const now = Date.now()
  prune(now)

  const entry = store.get(key)
  if (!entry) {
    store.set(key, { count: 1, resetAt: now + options.windowMs })
    return true
  }
  if (entry.resetAt <= now) {
    entry.count = 1
    entry.resetAt = now + options.windowMs
    return true
  }
  if (entry.count >= options.maxAttempts) return false
  entry.count++
  return true
}

/** Login: 10 attempts per 15 minutes per IP. */
export const LOGIN_LIMIT = { maxAttempts: 10, windowMs: 15 * 60 * 1000 }

/** Change-password: 5 attempts per 15 minutes per IP. */
export const CHANGE_PASSWORD_LIMIT = { maxAttempts: 5, windowMs: 15 * 60 * 1000 }

/** Client IP from request (for rate limit key). Prefers x-forwarded-for when behind a proxy. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const real = request.headers.get('x-real-ip')
  if (real) return real
  return 'unknown'
}
