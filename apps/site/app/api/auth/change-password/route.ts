import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCmsUrl } from '@repo/env'
import { getToken } from '@/lib/auth'
import { checkRateLimit, getClientIp, CHANGE_PASSWORD_LIMIT } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  if (!checkRateLimit(`change-password:${ip}`, CHANGE_PASSWORD_LIMIT)) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in 15 minutes.' },
      { status: 429, headers: { 'Retry-After': '900' } },
    )
  }

  const cookieStore = await cookies()
  const token = getToken(cookieStore)
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { currentPassword?: string; newPassword?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { currentPassword, newPassword } = body ?? {}
  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: 'Current password and new password are required' },
      { status: 400 },
    )
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: 'New password must be at least 8 characters' },
      { status: 400 },
    )
  }

  try {
    const cmsUrl = getCmsUrl()
    const meRes = await fetch(`${cmsUrl}/api/users/me?depth=0`, {
      headers: { Authorization: `JWT ${token}` },
      next: { revalidate: 0 },
    })
    const meData = await meRes.json().catch(() => ({}))
    if (!meRes.ok || !meData.user) {
      return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 })
    }

    const user = meData.user as { id: string; email?: string }
    const email = user.email
    if (!email) {
      return NextResponse.json({ error: 'Unable to identify account' }, { status: 400 })
    }

    const loginRes = await fetch(`${cmsUrl}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: currentPassword }),
    })
    if (!loginRes.ok) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 },
      )
    }

    const updateRes = await fetch(`${cmsUrl}/api/users/${user.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `JWT ${token}`,
      },
      body: JSON.stringify({ password: newPassword }),
    })

    if (!updateRes.ok) {
      const errData = await updateRes.json().catch(() => ({}))
      const message =
        (errData as { message?: string }).message ||
        (errData as { errors?: { message?: string }[] }).errors?.[0]?.message ||
        'Failed to update password'
      return NextResponse.json({ error: message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Change password error:', err)
    return NextResponse.json(
      { error: 'Something went wrong. Try again later.' },
      { status: 500 },
    )
  }
}
