/**
 * Forwards survey submissions to the CMS (platform-survey-responses).
 * Uses cookie JWT; company is derived from the authenticated user.
 */
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getToken } from '@/lib/auth'

const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = getToken(cookieStore)
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as {
      respondent?: { name?: string; email?: string; company?: string }
      answers: Record<string, unknown>
      completionTime?: number
      company?: string
    }

    const base = CMS_URL.replace(/\/$/, '')
    const meRes = await fetch(`${base}/api/users/me?depth=1`, {
      headers: { Authorization: `JWT ${token}` },
      cache: 'no-store',
    })
    if (!meRes.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const meData = await meRes.json().catch(() => ({}))
    const user = meData.user as { company?: string | { id: string } } | undefined
    const companyId =
      body.company ??
      (typeof user?.company === 'object' && user?.company?.id
        ? user.company.id
        : typeof user?.company === 'string'
          ? user.company
          : null)

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
      console.error('[survey/responses] CMS returned', res.status, text)
      return NextResponse.json(
        { error: 'Failed to save response', details: text },
        { status: res.status >= 500 ? 502 : res.status }
      )
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[survey/responses]', message)
    return NextResponse.json({ error: 'Failed to save response', details: message }, { status: 502 })
  }
}
