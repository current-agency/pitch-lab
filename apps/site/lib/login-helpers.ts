/**
 * Helpers used by the login API route. Exported for testing.
 */
export { getCmsUrl } from '@repo/env'

export function isLocalhost(url: string): boolean {
  try {
    const u = new URL(url)
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1'
  } catch {
    return url.includes('localhost') || url.includes('127.0.0.1')
  }
}

export function getErrorMessage(data: unknown): string {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    if (typeof d.message === 'string') return d.message
    if (Array.isArray(d.errors) && d.errors[0] && typeof d.errors[0] === 'object') {
      const first = (d.errors[0] as { message?: string }).message
      if (typeof first === 'string') return first
    }
    if (typeof d.error === 'string') return d.error
  }
  return 'Login failed'
}
