import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from '@/lib/auth'

const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const cookieStore = await cookies()
  const token = getToken(cookieStore)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!id) return NextResponse.json({ error: 'Missing activity id' }, { status: 400 })

  try {
    const res = await fetch(`${CMS_URL}/api/audience-poker-activities/${id}?depth=0`, {
      headers: { Accept: 'application/json', Authorization: `JWT ${token}` },
      next: { revalidate: 0 },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (res.status === 404) return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
      return NextResponse.json(
        { error: (data as { message?: string }).message ?? 'Failed to load activity' },
        { status: res.status >= 500 ? 502 : res.status },
      )
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('[site /api/apps/audience-poker/activity]', err)
    return NextResponse.json({ error: 'Failed to load activity' }, { status: 502 })
  }
}
