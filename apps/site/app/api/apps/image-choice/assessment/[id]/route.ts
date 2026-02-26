import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from '@/lib/auth'

const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'

function rewriteMediaUrls(obj: unknown, baseUrl: string): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') return obj
  if (Array.isArray(obj)) return obj.map((item) => rewriteMediaUrls(item, baseUrl))
  if (typeof obj === 'object') {
    const record = obj as Record<string, unknown>
    if (typeof record.url === 'string' && record.url.startsWith('/')) {
      return { ...record, url: `${baseUrl.replace(/\/$/, '')}${record.url}` }
    }
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(record)) {
      out[k] = rewriteMediaUrls(v, baseUrl)
    }
    return out
  }
  return obj
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const cookieStore = await cookies()
  const token = getToken(cookieStore)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!id) return NextResponse.json({ error: 'Missing assessment id' }, { status: 400 })

  try {
    const url = `${CMS_URL}/api/image-choice-assessments/${id}?depth=2`
    const res = await fetch(url, {
      headers: { Accept: 'application/json', Authorization: `JWT ${token}` },
      next: { revalidate: 0 },
    })
    const text = await res.text()
    if (!res.ok) {
      if (res.status === 404) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
      return NextResponse.json({ error: text || res.statusText }, { status: res.status >= 500 ? 502 : res.status })
    }
    const data = text ? JSON.parse(text) : null
    const rewritten = rewriteMediaUrls(data, CMS_URL)
    return NextResponse.json(rewritten)
  } catch (err) {
    console.error('[site /api/apps/image-choice/assessment]', err)
    return NextResponse.json({ error: 'Failed to load assessment' }, { status: 502 })
  }
}
