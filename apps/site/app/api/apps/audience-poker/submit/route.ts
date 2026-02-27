import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCmsUrl } from '@repo/env'
import { getToken } from '@/lib/auth'
import { isAssigned } from '@/lib/assigned-apps'
import { apiError, apiUnauthorized } from '@/lib/api-response'
import { createLogger } from '@repo/env'

const log = createLogger('audience-poker/submit')

type RequestBody = {
  activityId: string
  allocations: { audienceIndex: number; audienceLabel: string; chips: number }[]
}

function validate(allocations: number[], chipBudget: number): { canSubmit: boolean; errors: { unspentChips: boolean; zeroAllocation: boolean; duplicateValues: boolean } } {
  const total = allocations.reduce((sum, n) => sum + n, 0)
  const hasZero = allocations.some((n) => n < 1)
  const hasDuplicates = new Set(allocations).size !== allocations.length
  return {
    canSubmit: total === chipBudget && !hasZero && !hasDuplicates,
    errors: {
      unspentChips: total !== chipBudget,
      zeroAllocation: hasZero,
      duplicateValues: hasDuplicates,
    },
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = getToken(cookieStore)
  if (!token) return NextResponse.json(apiUnauthorized(), { status: 401 })

  let body: RequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(apiError('Invalid JSON'), { status: 400 })
  }
  const { activityId, allocations } = body
  if (!activityId || !Array.isArray(allocations)) {
    return NextResponse.json(apiError('activityId and allocations (array) required'), { status: 400 })
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
  if (!isAssigned(user, 'audience-poker-activities', activityId)) {
    return NextResponse.json(apiError('You do not have access to this activity'), { status: 403 })
  }

  const activityRes = await fetch(`${base}/api/audience-poker-activities/${activityId}?depth=0`, {
    headers: { Authorization: `JWT ${token}` },
    next: { revalidate: 0 },
  })
  if (!activityRes.ok) {
    if (activityRes.status === 404) return NextResponse.json(apiError('Activity not found'), { status: 404 })
    return NextResponse.json(apiError('Failed to load activity'), { status: 502 })
  }
  const activity = (await activityRes.json()) as { chipBudget: number; audiences: { label: string }[] }
  const audienceCount = (activity.audiences || []).length

  if (allocations.length !== audienceCount) {
    return NextResponse.json(apiError('Allocation count does not match activity audiences'), { status: 400 })
  }
  const chipValues = allocations.map((a) => a.chips)
  const result = validate(chipValues, activity.chipBudget)
  if (!result.canSubmit) {
    const messages: string[] = []
    if (result.errors.zeroAllocation) messages.push('Every audience must receive at least 1 chip.')
    if (result.errors.duplicateValues) messages.push('No two audiences can receive the same number of chips.')
    if (result.errors.unspentChips) messages.push('All chips must be spent.')
    return NextResponse.json(apiError(messages.join(' ') || 'Invalid allocation'), { status: 400 })
  }

  const submissionsRes = await fetch(
    `${base}/api/audience-poker-submissions?where[activity][equals]=${activityId}&where[user][equals]=${userId}&limit=1`,
    { headers: { Authorization: `JWT ${token}` }, next: { revalidate: 0 } },
  )
  if (!submissionsRes.ok) {
    return NextResponse.json(apiError('Failed to check existing submission'), { status: 502 })
  }
  const submissionsData = (await submissionsRes.json()) as { docs: unknown[] }
  if (submissionsData.docs?.length > 0) {
    return NextResponse.json(apiError('You have already submitted this activity.'), { status: 409 })
  }

  const payload = {
    activity: activityId,
    user: userId,
    allocations: allocations.map((a) => ({ audienceLabel: a.audienceLabel, chips: a.chips })),
  }
  const createRes = await fetch(`${base}/api/audience-poker-submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify(payload),
  })
  const createData = await createRes.json().catch(() => ({}))
  if (!createRes.ok) {
    const msg = (createData as { errors?: { message?: string }[] })?.errors?.[0]?.message ?? 'Failed to save submission'
    log.error('CMS create submission', createRes.status, msg)
    return NextResponse.json(apiError(msg), { status: createRes.status >= 500 ? 502 : createRes.status })
  }
  return NextResponse.json({ success: true })
}
