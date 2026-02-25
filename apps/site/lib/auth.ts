import { redirect } from 'next/navigation'

/** In production use __Host- prefix so cookie is host-only, secure, and path=/. */
export const AUTH_COOKIE_NAME =
  process.env.NODE_ENV === 'production' ? '__Host-payload-token' : 'payload-token'

type CookieStore = {
  get(name: string): { value: string } | undefined
}

export function getToken(cookieStore: CookieStore): string | undefined {
  return cookieStore.get(AUTH_COOKIE_NAME)?.value
}

/**
 * Use in dashboard (and other protected) server components.
 * Redirects to /login if no token; otherwise returns { token }.
 */
export function requireAuth(cookieStore: CookieStore): { token: string } {
  const token = getToken(cookieStore)
  if (!token) redirect('/login')
  return { token }
}
