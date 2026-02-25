import { NextResponse } from 'next/server'

const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'
const COOKIE_NAME = 'payload-token'
const COOKIE_MAX_AGE = 60 * 60 * 2 // 2 hours (match Payload tokenExpiration)

function getErrorMessage(data: unknown): string {
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

  const cmsUrl = CMS_URL.replace(/\/?$/, '')
  let res: Response
  try {
    res = await fetch(`${cmsUrl}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  } catch (err) {
    console.error('Login error (CMS unreachable):', err)
    return NextResponse.json(
      { error: 'Unable to reach authentication service. Try again later.' },
      { status: 503 },
    )
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
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
  return response
}
