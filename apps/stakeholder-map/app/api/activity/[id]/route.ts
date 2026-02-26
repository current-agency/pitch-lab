import { NextResponse } from 'next/server'
import { getCmsUrl } from '@repo/env'
import { verifyActivityLinkToken } from '@repo/env'

function getCmsHeaders(): Record<string, string> {
  const secret = process.env.ACTIVITY_LINK_SECRET
  const out: Record<string, string> = {}
  if (secret) out['x-activity-app-secret'] = secret
  return out
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: activityId } = await params
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token') ?? request.headers.get('x-stakeholder-map-token')

  if (!activityId) {
    return NextResponse.json({ error: 'activity id required' }, { status: 400 })
  }
  if (!token) {
    return NextResponse.json({ error: 'token required (query or header)' }, { status: 401 })
  }
  const userId = verifyActivityLinkToken(token)
  if (!userId) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  const cmsUrl = getCmsUrl()
  const url = `${cmsUrl}/api/stakeholder-map-activities/${activityId}?depth=0`
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', ...getCmsHeaders() },
      next: { revalidate: 0 },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message =
        res.status === 403
          ? 'CMS denied access. Set ACTIVITY_LINK_SECRET to the same value in the CMS and this app.'
          : (data as { errors?: { message?: string }[] })?.errors?.[0]?.message ?? 'Failed to fetch activity'
      return NextResponse.json(
        { error: message },
        { status: res.status >= 500 ? 502 : res.status },
      )
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('[stakeholder-map /api/activity]', err)
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 502 })
  }
}
