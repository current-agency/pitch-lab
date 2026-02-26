export {
  createActivityLinkToken,
  verifyActivityLinkToken,
} from './activity-link-token'

/**
 * Returns the CMS base URL with no trailing slash.
 * Used by apps that call the Payload CMS API (e.g. audience-poker, image-choice, site).
 */
export function getCmsUrl(): string {
  const url = process.env.CMS_URL || 'http://localhost:3001'
  return url.replace(/\/?$/, '')
}

export type Logger = {
  error: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
}

/**
 * Creates a simple logger that prefixes messages with [prefix].
 * Use this instead of console so you can swap to a log service later.
 */
export function createLogger(prefix: string): Logger {
  const p = `[${prefix}]`
  return {
    error: (...args: unknown[]) => console.error(p, ...args),
    warn: (...args: unknown[]) => console.warn(p, ...args),
    info: (...args: unknown[]) => console.info(p, ...args),
  }
}
