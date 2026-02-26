import { NextResponse } from 'next/server'
import { verifyImageChoiceToken } from '../../../lib/verify-token'

const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'

type ResponseItem = { pairIndex: number; side: 'left' | 'right'; elapsedMs: number }

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      assessmentId: string
      responses: ResponseItem[]
      token?: string | null
    }
    const { assessmentId, responses, token } = body
    if (!assessmentId || !Array.isArray(responses)) {
      return NextResponse.json(
        { error: 'assessmentId and responses (array) required' },
        { status: 400 },
      )
    }

    let userId: string | null = null
    if (token && typeof token === 'string') {
      userId = verifyImageChoiceToken(token)
    }

    const base = CMS_URL.replace(/\/$/, '')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    if (process.env.IMAGE_CHOICE_API_SECRET) {
      headers['x-image-choice-secret'] = process.env.IMAGE_CHOICE_API_SECRET
    }

    const payload: { assessment: string; responses: ResponseItem[]; user?: string } = {
      assessment: assessmentId,
      responses,
    }
    if (userId) payload.user = userId

    const res = await fetch(`${base}/api/image-choice-responses`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    const text = await res.text()
    if (!res.ok) {
      console.error('[image-choice /api/responses] CMS error:', res.status, text)
      const is403 = res.status === 403
      const message = is403
        ? 'CMS rejected the request (403). If CMS has IMAGE_CHOICE_API_SECRET set, set the same value in image-choice .env so the app can save responses.'
        : 'Failed to save responses'
      return NextResponse.json(
        { error: message, details: text || res.statusText },
        { status: res.status >= 500 ? 502 : res.status },
      )
    }

    let data: unknown
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[image-choice /api/responses]', message)
    return NextResponse.json(
      { error: 'Failed to save responses', details: message },
      { status: 502 },
    )
  }
}
