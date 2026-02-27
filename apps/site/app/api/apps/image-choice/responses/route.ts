import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCmsUrl } from '@repo/env'
import { getToken } from '@/lib/auth'
import { isAssigned } from '@/lib/assigned-apps'
import { apiError, apiUnauthorized } from '@/lib/api-response'
import { createLogger } from '@repo/env'

const log = createLogger('image-choice/responses')

type ResponseItem = { pairIndex: number; side: 'left' | 'right'; elapsedMs: number }

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = getToken(cookieStore)
  if (!token) return NextResponse.json(apiUnauthorized(), { status: 401 })

  let body: { assessmentId?: string; responses?: ResponseItem[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(apiError('Invalid JSON'), { status: 400 })
  }
  const { assessmentId, responses } = body ?? {}
  if (!assessmentId || !Array.isArray(responses)) {
    return NextResponse.json(
      apiError('assessmentId and responses (array) required'),
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
  if (!isAssigned(user, 'image-choice-assessments', assessmentId)) {
    return NextResponse.json(apiError('You do not have access to this assessment'), { status: 403 })
  }

  const payload = { assessment: assessmentId, responses, user: userId }
  try {
    const res = await fetch(`${base}/api/image-choice-responses`, {
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
      const msg = (data as { errors?: { message?: string }[] })?.errors?.[0]?.message ?? 'Failed to save'
      log.error('CMS save responses', res.status, msg)
      return NextResponse.json(apiError(msg), { status: res.status >= 500 ? 502 : res.status })
    }
    return NextResponse.json(data)
  } catch (err) {
    log.error(err)
    return NextResponse.json(apiError('Failed to save responses'), { status: 502 })
  }
}
