import { NextResponse } from 'next/server'
import { createLogger, getCmsUrl } from '@repo/env'

const log = createLogger('audience-poker/activity')

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing activity id' }, { status: 400 })

  try {
    const res = await fetch(`${getCmsUrl()}/api/audience-poker-activities/${id}?depth=0`, {
      next: { revalidate: 0 },
    })
    const text = await res.text()
    if (!res.ok) {
      if (res.status === 404) return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
      log.error('CMS error:', res.status, text)
      return NextResponse.json(
        { error: text || res.statusText },
        { status: res.status >= 500 ? 502 : res.status },
      )
    }
    let data: unknown
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      log.error('CMS returned non-JSON:', text.slice(0, 200))
      return NextResponse.json({ error: 'Invalid response from CMS' }, { status: 502 })
    }
    return NextResponse.json(data)
  } catch (err) {
    log.error(err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load activity' },
      { status: 502 },
    )
  }
}
