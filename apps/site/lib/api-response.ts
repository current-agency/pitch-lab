/**
 * Standard API error payloads. Use for consistent error shape across routes.
 */

export function apiUnauthorized(): { error: string } {
  return { error: 'Unauthorized' }
}

export function apiError(error: string, details?: string): { error: string; details?: string } {
  return details ? { error, details } : { error }
}
