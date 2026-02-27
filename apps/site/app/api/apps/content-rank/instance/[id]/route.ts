/**
 * Fetches a content-rank instance by ID using cookie JWT.
 * Returns only id and title (accessToken is not exposed to the client).
 */
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getCmsUrl } from '@repo/env'
import { getToken } from '@/lib/auth'
import { apiError, apiUnauthorized } from '@/lib/api-response'
import { createLogger } from '@repo/env'

const log = createLogger('content-rank/instance')

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies()
  const token = getToken(cookieStore)
  if (!token) {
    return NextResponse.json(apiUnauthorized(), { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json(apiError('id required'), { status: 400 })
  }

  try {
    const base = getCmsUrl()
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
      return NextResponse.json(apiError('Not found'), { status: 404 })
    }
    if (doc.isActive === false) {
      return NextResponse.json(apiError('Not found'), { status: 404 })
    }
    return NextResponse.json({ id: doc.id, title: doc.title ?? 'Content rank' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error(message)
    return NextResponse.json(apiError('Failed to load instance', message), { status: 502 })
  }
}
