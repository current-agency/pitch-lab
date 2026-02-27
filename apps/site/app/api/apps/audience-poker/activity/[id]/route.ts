import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCmsUrl } from '@repo/env'
import { getToken } from '@/lib/auth'
import { apiError, apiUnauthorized } from '@/lib/api-response'
import { createLogger } from '@repo/env'

const log = createLogger('audience-poker/activity')

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const cookieStore = await cookies()
  const token = getToken(cookieStore)
  if (!token) return NextResponse.json(apiUnauthorized(), { status: 401 })
  if (!id) return NextResponse.json(apiError('Missing activity id'), { status: 400 })

  try {
    const res = await fetch(`${getCmsUrl()}/api/audience-poker-activities/${id}?depth=0`, {
      headers: { Accept: 'application/json', Authorization: `JWT ${token}` },
      next: { revalidate: 0 },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (res.status === 404) return NextResponse.json(apiError('Activity not found'), { status: 404 })
      return NextResponse.json(
        apiError((data as { message?: string }).message ?? 'Failed to load activity'),
        { status: res.status >= 500 ? 502 : res.status },
      )
    }
    return NextResponse.json(data)
  } catch (err) {
    log.error(err)
    return NextResponse.json(apiError('Failed to load activity'), { status: 502 })
  }
}
