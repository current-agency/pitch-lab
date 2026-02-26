/**
 * Fetches a content-rank instance by ID using cookie JWT.
 * Returns only id and title (accessToken is not exposed to the client).
 */
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getToken } from '@/lib/auth'

const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies()
  const token = getToken(cookieStore)
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  try {
    const base = CMS_URL.replace(/\/$/, '')
    const res = await fetch(`${base}/api/content-rank/${id}?depth=0`, {
      headers: { Authorization: `JWT ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return NextResponse.json(data, { status: res.status })
    }
    const doc = (await res.json()) as { id?: string; title?: string; isActive?: boolean }
    if (!doc?.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (doc.isActive === false) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ id: doc.id, title: doc.title ?? 'Content rank' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[content-rank/instance]', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
