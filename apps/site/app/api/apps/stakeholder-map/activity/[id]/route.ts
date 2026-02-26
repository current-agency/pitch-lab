import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from '@/lib/auth'

const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: activityId } = await context.params
  const cookieStore = await cookies()
  const token = getToken(cookieStore)
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!activityId) {
    return NextResponse.json({ error: 'activity id required' }, { status: 400 })
  }

  const url = `${CMS_URL}/api/stakeholder-map-activities/${activityId}?depth=0`
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', Authorization: `JWT ${token}` },
      next: { revalidate: 0 },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message =
        (data as { errors?: { message?: string }[] })?.errors?.[0]?.message ?? 'Failed to fetch activity'
      return NextResponse.json(
        { error: message },
        { status: res.status >= 500 ? 502 : res.status },
      )
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('[site /api/apps/stakeholder-map/activity]', err)
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 502 })
  }
}
