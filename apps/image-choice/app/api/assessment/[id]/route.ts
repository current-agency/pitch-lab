import { NextResponse } from 'next/server'

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
  let id: string
  try {
    const p = await params
    id = p.id
  } catch (err) {
    console.error('[image-choice /api/assessment/[id]] params error:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (!id) return NextResponse.json({ error: 'Missing assessment id' }, { status: 400 })

  try {
    const url = `${CMS_URL}/api/image-choice-assessments/${id}?depth=2`
    const res = await fetch(url, { next: { revalidate: 0 } })
    const text = await res.text()

    if (!res.ok) {
      console.error('[image-choice /api/assessment/[id]] CMS error:', res.status, url, text.slice(0, 300))
      if (res.status === 404) {
        return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
      }
      const message =
        res.status === 500
          ? 'CMS returned an error. Check that the CMS is running (e.g. port 3001) and the database is available.'
          : text || res.statusText
      return NextResponse.json({ error: message }, { status: 502 })
    }

    let data: unknown
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      console.error('[image-choice /api/assessment/[id]] CMS returned non-JSON:', text.slice(0, 200))
      return NextResponse.json(
        { error: 'Invalid response from CMS' },
        { status: 502 },
      )
    }

    const rewritten = rewriteMediaUrls(data, CMS_URL) as typeof data
    return NextResponse.json(rewritten)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[image-choice /api/assessment/[id]]', message, err)
    return NextResponse.json(
      {
        error:
          message.includes('fetch') || message.includes('ECONNREFUSED')
            ? 'Cannot reach CMS. Start the CMS app (e.g. pnpm --filter cms dev on port 3001) and ensure CMS_URL is correct.'
            : `Failed to load assessment: ${message}`,
      },
      { status: 502 },
    )
  }
}
