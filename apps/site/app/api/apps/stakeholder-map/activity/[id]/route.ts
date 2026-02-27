import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCmsUrl } from '@repo/env'
import { getToken } from '@/lib/auth'
import { apiError, apiUnauthorized } from '@/lib/api-response'
import { createLogger } from '@repo/env'

const log = createLogger('stakeholder-map/activity')

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: activityId } = await context.params
  const cookieStore = await cookies()
  const token = getToken(cookieStore)
  if (!token) {
    return NextResponse.json(apiUnauthorized(), { status: 401 })
  }
  if (!activityId) {
    return NextResponse.json(apiError('activity id required'), { status: 400 })
  }

  const base = getCmsUrl()
  try {
    const url = `${base}/api/stakeholder-map-activities/${activityId}?depth=0`
    const res = await fetch(url, {
      headers: { Accept: 'application/json', Authorization: `JWT ${token}` },
      next: { revalidate: 0 },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message =
        (data as { errors?: { message?: string }[] })?.errors?.[0]?.message ?? 'Failed to fetch activity'
      return NextResponse.json(apiError(message), { status: res.status >= 500 ? 502 : res.status })
    }
    return NextResponse.json(data)
  } catch (err) {
    log.error(err)
    return NextResponse.json(apiError('Failed to fetch activity'), { status: 502 })
  }
}
