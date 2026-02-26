import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from '@/lib/auth'

const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'

type ResponseItem = { pairIndex: number; side: 'left' | 'right'; elapsedMs: number }

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = getToken(cookieStore)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { assessmentId?: string; responses?: ResponseItem[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { assessmentId, responses } = body ?? {}
  if (!assessmentId || !Array.isArray(responses)) {
    return NextResponse.json(
      { error: 'assessmentId and responses (array) required' },
      { status: 400 },
    )
  }

  const meRes = await fetch(`${CMS_URL}/api/users/me?depth=0`, {
    headers: { Authorization: `JWT ${token}` },
    next: { revalidate: 0 },
  })
  const meData = await meRes.json().catch(() => ({}))
  const userId = (meData as { user?: { id?: string } })?.user?.id
  if (!meRes.ok || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = { assessment: assessmentId, responses, user: userId }
  try {
    const res = await fetch(`${CMS_URL}/api/image-choice-responses`, {
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
        { error: (data as { errors?: { message?: string }[] })?.errors?.[0]?.message ?? 'Failed to save' },
        { status: res.status >= 500 ? 502 : res.status },
      )
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('[site /api/apps/image-choice/responses]', err)
    return NextResponse.json({ error: 'Failed to save responses' }, { status: 502 })
  }
}
