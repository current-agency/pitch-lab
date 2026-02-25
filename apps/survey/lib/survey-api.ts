/**
 * Helpers for survey API routes. Exported for testing.
 */

export function buildConfigUrl(baseUrl: string, companyId: string): string {
  const base = baseUrl.replace(/\/$/, '')
  return `${base}/api/platform-survey-config?company=${encodeURIComponent(companyId)}`
}
