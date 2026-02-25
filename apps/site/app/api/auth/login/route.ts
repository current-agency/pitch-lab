import { NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME } from '@/lib/auth'
import { getCmsUrl, getErrorMessage, isLocalhost } from '@/lib/login-helpers'

const COOKIE_MAX_AGE = 60 * 60 * 2 // 2 hours (match Payload tokenExpiration)

// Production: consider adding rate limiting (e.g. Vercel Rate Limit, Upstash Redis) to limit login attempts per IP.
export async function POST(request: Request) {
  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, password } = body ?? {}
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const cmsUrl = getCmsUrl()
  const inProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
  const cmsIsLocalhost = isLocalhost(cmsUrl)

  let res: Response
  try {
    res = await fetch(`${cmsUrl}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  } catch (err) {
    console.error('Login error (CMS unreachable):', err)
    const cause = err instanceof Error ? err.cause : undefined
    const isConnectionRefused =
      (cause instanceof Error && (cause as NodeJS.ErrnoException).code === 'ECONNREFUSED') ||
      (err instanceof Error && (err as NodeJS.ErrnoException).code === 'ECONNREFUSED')
    const message =
      inProduction && (cmsIsLocalhost || isConnectionRefused)
        ? 'Login is not configured for production. Set CMS_URL to your deployed CMS URL (e.g. https://your-cms.vercel.app) in Vercel → Project → Settings → Environment Variables.'
        : 'Unable to reach authentication service. Try again later.'
    return NextResponse.json({ error: message }, { status: 503 })
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const status = res.status >= 500 ? 502 : res.status
    return NextResponse.json(
      { error: getErrorMessage(data) },
      { status },
    )
  }

  const token = (data as { token?: string }).token
  if (!token) {
    return NextResponse.json({ error: 'No token in response' }, { status: 502 })
  }

  const response = NextResponse.json({ user: (data as { user?: unknown }).user })
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
  return response
}
