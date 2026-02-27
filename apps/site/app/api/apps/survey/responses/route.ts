/**
 * Forwards survey submissions to the CMS (platform-survey-responses).
 * Company is always derived from the authenticated user; body.company is ignored.
 */
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getCmsUrl } from '@repo/env'
import { getToken } from '@/lib/auth'
import { apiError, apiUnauthorized } from '@/lib/api-response'
import { createLogger } from '@repo/env'

const log = createLogger('survey/responses')

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = getToken(cookieStore)
  if (!token) {
    return NextResponse.json(apiUnauthorized(), { status: 401 })
  }

  try {
    const body = (await request.json()) as {
      respondent?: { name?: string; email?: string; company?: string }
      answers: Record<string, unknown>
      completionTime?: number
    }

    const base = getCmsUrl()
    const meRes = await fetch(`${base}/api/users/me?depth=1`, {
      headers: { Authorization: `JWT ${token}` },
      cache: 'no-store',
    })
    if (!meRes.ok) {
      return NextResponse.json(apiUnauthorized(), { status: 401 })
    }
    const meData = await meRes.json().catch(() => ({}))
    const user = meData.user as { company?: string | { id: string } } | undefined
    const companyId =
      typeof user?.company === 'object' && user?.company?.id
        ? user.company.id
        : typeof user?.company === 'string'
          ? user.company
          : null

    const res = await fetch(`${base}/api/platform-survey-responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `JWT ${token}`,
      },
      body: JSON.stringify({
        respondent: body.respondent ?? {},
        answers: body.answers,
        completionTime: body.completionTime,
        company: companyId ?? null,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      log.error('CMS returned', res.status, text)
      return NextResponse.json(
        apiError('Failed to save response', text),
        { status: res.status >= 500 ? 502 : res.status }
      )
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error(message)
    return NextResponse.json(apiError('Failed to save response', message), { status: 502 })
  }
}
