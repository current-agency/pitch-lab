import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCmsUrl, createLogger } from '@repo/env'
import { getToken } from '@/lib/auth'
import { apiError, apiUnauthorized } from '@/lib/api-response'

const log = createLogger('auth/me')

export async function GET() {
  const cookieStore = await cookies()
  const token = getToken(cookieStore)
  if (!token) {
    return NextResponse.json(apiUnauthorized(), { status: 401 })
  }

  try {
    const res = await fetch(`${getCmsUrl()}/api/users/me?depth=1`, {
      headers: { Authorization: `JWT ${token}` },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        apiError((data as { message?: string }).message || 'Unauthorized'),
        { status: res.status },
      )
    }
    return NextResponse.json(data.user)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch user'
    log.error(message, err)
    return NextResponse.json(apiError(message), { status: 500 })
  }
}
