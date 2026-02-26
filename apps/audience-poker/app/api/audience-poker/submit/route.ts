import { NextResponse } from 'next/server'
import { validate } from '../../../../lib/validate'

const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'

type RequestBody = {
  activityId: string
  userId?: string | null
  allocations: { audienceIndex: number; audienceLabel: string; chips: number }[]
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody
    const { activityId, userId, allocations } = body
    if (!activityId || !Array.isArray(allocations)) {
      return NextResponse.json(
        { error: 'activityId and allocations (array) required' },
        { status: 400 },
      )
    }
    // User is required for submission; can be provided via token resolution or request body when opened from dashboard
    const submitUserId = userId ?? null
    if (!submitUserId) {
      return NextResponse.json(
        { error: 'User context required to submit. Open this activity from the dashboard.' },
        { status: 401 },
      )
    }

    // 1. Fetch activity from Payload
    const activityRes = await fetch(`${CMS_URL}/api/audience-poker-activities/${activityId}?depth=0`, {
      next: { revalidate: 0 },
    })
    if (!activityRes.ok) {
      if (activityRes.status === 404) {
        return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to load activity' }, { status: 502 })
    }
    const activity = (await activityRes.json()) as {
      id: string
      chipBudget: number
      audiences: { id: string; label: string }[]
    }

    const chipBudget = activity.chipBudget
    const audienceCount = (activity.audiences || []).length

    // 2. Validate allocation count and indices
    if (allocations.length !== audienceCount) {
      return NextResponse.json(
        { error: 'Allocation count does not match activity audiences' },
        { status: 400 },
      )
    }
    const validIndices = new Set(allocations.map((a) => a.audienceIndex))
    if (validIndices.size !== audienceCount || [...validIndices].some((i) => i < 0 || i >= audienceCount)) {
      return NextResponse.json({ error: 'Invalid audience indices in allocations' }, { status: 400 })
    }

    // 3. Run same validation as client
    const chipValues = allocations.map((a) => a.chips)
    const result = validate(chipValues, chipBudget)
    if (!result.canSubmit) {
      const messages: string[] = []
      if (result.errors.zeroAllocation) messages.push('Every audience must receive at least 1 chip.')
      if (result.errors.duplicateValues) messages.push('No two audiences can receive the same number of chips.')
      if (result.errors.unspentChips) messages.push('All chips must be spent.')
      return NextResponse.json(
        { error: messages.join(' ') || 'Invalid allocation' },
        { status: 400 },
      )
    }

    // 4. Check for existing submission (prevent double-submit)
    {
      const submissionsRes = await fetch(
        `${CMS_URL}/api/audience-poker-submissions?where[activity][equals]=${activityId}&where[user][equals]=${submitUserId}&limit=1`,
        { next: { revalidate: 0 }, headers: getCmsHeaders() },
      )
      if (!submissionsRes.ok) {
        return NextResponse.json({ error: 'Failed to check existing submission' }, { status: 502 })
      }
      const submissionsData = (await submissionsRes.json()) as { docs: unknown[] }
      if (submissionsData.docs?.length > 0) {
        return NextResponse.json(
          { error: 'You have already submitted this activity.' },
          { status: 409 },
        )
      }
    }

    // 5. Save submission to Payload
    const payload = {
      activity: activityId,
      user: submitUserId,
      allocations: allocations.map((a) => ({ audienceLabel: a.audienceLabel, chips: a.chips })),
    }
    const createRes = await fetch(`${CMS_URL}/api/audience-poker-submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getCmsHeaders() },
      body: JSON.stringify(payload),
    })
    const createText = await createRes.text()
    if (!createRes.ok) {
      console.error('[audience-poker submit] CMS create error:', createRes.status, createText)
      return NextResponse.json(
        { error: createRes.status === 403 ? 'Not authorized to save submission. Set AUDIENCE_POKER_API_SECRET in CMS and app.' : 'Failed to save submission' },
        { status: createRes.status >= 500 ? 502 : createRes.status },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[audience-poker submit]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Submission failed' },
      { status: 502 },
    )
  }
}

function getCmsHeaders(): Record<string, string> {
  const secret = process.env.AUDIENCE_POKER_API_SECRET
  const out: Record<string, string> = {}
  if (secret) out['x-audience-poker-secret'] = secret
  return out
}
