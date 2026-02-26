import { NextResponse } from 'next/server'
import { getCmsUrl } from '@repo/env'
import { verifyStakeholderMapToken } from '../../../lib/verify-token'

type Placement = { stakeholder: string; quadrant: string }

function getCmsHeaders(): Record<string, string> {
  const secret = process.env.STAKEHOLDER_MAP_API_SECRET
  const out: Record<string, string> = {}
  if (secret) out['x-stakeholder-map-secret'] = secret
  return out
}

export async function POST(request: Request) {
  let body: { company?: string; token?: string; placements?: Placement[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { company, token, placements } = body ?? {}
  if (!company || !Array.isArray(placements)) {
    return NextResponse.json(
      { error: 'company and placements (array) required' },
      { status: 400 },
    )
  }
  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 401 })
  }
  const userId = verifyStakeholderMapToken(token)
  if (!userId) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  const payload = {
    company,
    submittedBy: userId,
    submittedAt: new Date().toISOString(),
    placements: placements.map((p) => ({ stakeholder: p.stakeholder, quadrant: p.quadrant })),
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
