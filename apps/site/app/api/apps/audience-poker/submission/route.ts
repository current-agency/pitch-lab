/**
 * Returns the current user's audience-poker submission for the given activity, if any.
 */
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getCmsUrl } from '@repo/env'
import { getToken } from '@/lib/auth'
import { apiError, apiUnauthorized } from '@/lib/api-response'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const token = getToken(cookieStore)
  if (!token) return NextResponse.json(apiUnauthorized(), { status: 401 })

  const { searchParams } = new URL(request.url)
  const activityId = searchParams.get('activity')?.trim()
  if (!activityId) return NextResponse.json(apiError('activity query required'), { status: 400 })

  const base = getCmsUrl()
  const meRes = await fetch(`${base}/api/users/me?depth=0`, {
    headers: { Authorization: `JWT ${token}` },
    cache: 'no-store',
  })
  if (!meRes.ok) return NextResponse.json(apiUnauthorized(), { status: 401 })
  const meData = await meRes.json().catch(() => ({}))
  const userId = (meData as { user?: { id?: string } }).user?.id
  if (!userId) return NextResponse.json(apiUnauthorized(), { status: 401 })

  const res = await fetch(
    `${base}/api/audience-poker-submissions?where[activity][equals]=${activityId}&where[user][equals]=${userId}&limit=1&depth=0`,
    { headers: { Authorization: `JWT ${token}` }, cache: 'no-store' }
  )
  if (!res.ok) return NextResponse.json(apiError('Failed to load'), { status: 502 })
  const data = await res.json().catch(() => ({ docs: [] }))
  const doc = (data.docs ?? [])[0] ?? null
  return NextResponse.json(doc)
}
