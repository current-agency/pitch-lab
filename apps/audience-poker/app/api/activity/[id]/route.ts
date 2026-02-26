import { NextResponse } from 'next/server'

const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing activity id' }, { status: 400 })

  try {
    const res = await fetch(`${CMS_URL}/api/audience-poker-activities/${id}?depth=0`, {
      next: { revalidate: 0 },
    })
    const text = await res.text()
    if (!res.ok) {
      if (res.status === 404) return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
      console.error('[audience-poker /api/activity] CMS error:', res.status, text)
      return NextResponse.json(
        { error: text || res.statusText },
        { status: res.status >= 500 ? 502 : res.status },
      )
    }
    const data = text ? JSON.parse(text) : null
    return NextResponse.json(data)
  } catch (err) {
    console.error('[audience-poker /api/activity]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load activity' },
      { status: 502 },
    )
  }
}
