import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from '@/lib/auth'

const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'

type Placement = { stakeholderId: string; quadrant: string }

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = getToken(cookieStore)
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { activity?: string; placements?: Placement[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { activity: activityId, placements } = body ?? {}
  if (!activityId || !Array.isArray(placements)) {
    return NextResponse.json(
      { error: 'activity and placements (array) required' },
      { status: 400 },
    )
  }

  // Resolve current user id from CMS
  const meRes = await fetch(`${CMS_URL}/api/users/me?depth=0`, {
    headers: { Authorization: `JWT ${token}` },
    next: { revalidate: 0 },
  })
  const meData = await meRes.json().catch(() => ({}))
  if (!meRes.ok || !(meData as { user?: { id?: string } }).user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = (meData as { user: { id: string } }).user.id

  const payload = {
    activity: activityId,
    submittedBy: userId,
    submittedAt: new Date().toISOString(),
    placements: placements.map((p) => ({ stakeholderId: p.stakeholderId, quadrant: p.quadrant })),
  }

  try {
    const res = await fetch(`${CMS_URL}/api/stakeholder-map-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `JWT ${token}`,
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            (data as { errors?: { message?: string }[] })?.errors?.[0]?.message ?? 'Failed to save submission',
        },
        { status: res.status >= 500 ? 502 : res.status },
      )
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('[site /api/apps/stakeholder-map/submit]', err)
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 502 })
  }
}
