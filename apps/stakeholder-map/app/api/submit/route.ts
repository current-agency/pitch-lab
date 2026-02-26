import { NextResponse } from 'next/server'
import { getCmsUrl } from '@repo/env'
import { verifyActivityLinkToken } from '@repo/env'

type Placement = { stakeholderId: string; quadrant: string }

function getCmsHeaders(): Record<string, string> {
  const secret = process.env.ACTIVITY_LINK_SECRET
  const out: Record<string, string> = {}
  if (secret) out['x-activity-app-secret'] = secret
  return out
}

export async function POST(request: Request) {
  let body: { activity?: string; token?: string; placements?: Placement[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { activity: activityId, token, placements } = body ?? {}
  if (!activityId || !Array.isArray(placements)) {
    return NextResponse.json(
      { error: 'activity and placements (array) required' },
      { status: 400 },
    )
  }
  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 401 })
  }
  const userId = verifyActivityLinkToken(token)
  if (!userId) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  const payload = {
    activity: activityId,
    submittedBy: userId,
    submittedAt: new Date().toISOString(),
    placements: placements.map((p) => ({ stakeholderId: p.stakeholderId, quadrant: p.quadrant })),
  }

  const cmsUrl = getCmsUrl()
  try {
    const res = await fetch(`${cmsUrl}/api/stakeholder-map-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...getCmsHeaders(),
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { error: (data as { errors?: { message?: string }[] })?.errors?.[0]?.message ?? 'Failed to save submission' },
        { status: res.status >= 500 ? 502 : res.status },
      )
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('[stakeholder-map /api/submit]', err)
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 502 })
  }
}
