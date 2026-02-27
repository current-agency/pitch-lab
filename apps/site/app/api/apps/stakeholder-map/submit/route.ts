import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCmsUrl } from '@repo/env'
import { getToken } from '@/lib/auth'
import { isAssigned } from '@/lib/assigned-apps'
import { apiError, apiUnauthorized } from '@/lib/api-response'
import { createLogger } from '@repo/env'

const log = createLogger('stakeholder-map/submit')

type Placement = { stakeholderId: string; quadrant: string; notes?: string }

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = getToken(cookieStore)
  if (!token) {
    return NextResponse.json(apiUnauthorized(), { status: 401 })
  }

  let body: { activity?: string; placements?: Placement[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(apiError('Invalid JSON'), { status: 400 })
  }

  const { activity: activityId, placements } = body ?? {}
  if (!activityId || !Array.isArray(placements)) {
    return NextResponse.json(
      apiError('activity and placements (array) required'),
      { status: 400 },
    )
  }

  const base = getCmsUrl()
  const meRes = await fetch(`${base}/api/users/me?depth=2`, {
    headers: { Authorization: `JWT ${token}` },
    next: { revalidate: 0 },
  })
  const meData = await meRes.json().catch(() => ({}))
  const user = (meData as { user?: { id?: string; assignedApplications?: unknown[] } }).user
  const userId = user?.id
  if (!meRes.ok || !userId) {
    return NextResponse.json(apiUnauthorized(), { status: 401 })
  }
  if (!isAssigned(user, 'stakeholder-map-activities', activityId)) {
    return NextResponse.json(apiError('You do not have access to this activity'), { status: 403 })
  }

  const payload = {
    activity: activityId,
    submittedBy: userId,
    submittedAt: new Date().toISOString(),
    placements: placements.map((p) => ({
      stakeholderId: p.stakeholderId,
      quadrant: p.quadrant,
      ...(typeof p.notes === 'string' && p.notes.trim() !== '' && { notes: p.notes.trim() }),
    })),
  }

  try {
    const res = await fetch(`${base}/api/stakeholder-map-submissions`, {
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
      const msg = (data as { errors?: { message?: string }[] })?.errors?.[0]?.message ?? 'Failed to save submission'
      log.error('CMS submit', res.status, msg)
      return NextResponse.json(apiError(msg), { status: res.status >= 500 ? 502 : res.status })
    }
    return NextResponse.json(data)
  } catch (err) {
    log.error(err)
    return NextResponse.json(apiError('Failed to save submission'), { status: 502 })
  }
}
