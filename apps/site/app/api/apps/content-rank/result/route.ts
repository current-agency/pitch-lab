/**
 * Proxies to CMS content-rank-result. Uses cookie JWT to fetch the instance
 * and get accessToken server-side, then calls CMS so the client never sees the token.
 */
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getToken } from '@/lib/auth'

const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const token = getToken(cookieStore)
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  try {
    const base = CMS_URL.replace(/\/$/, '')
    const docRes = await fetch(`${base}/api/content-rank/${id}?depth=0`, {
      headers: { Authorization: `JWT ${token}` },
      cache: 'no-store',
    })
    if (!docRes.ok) {
      const data = await docRes.json().catch(() => ({}))
      return NextResponse.json(data, { status: docRes.status })
    }
    const doc = (await docRes.json()) as { accessToken?: string; isActive?: boolean }
    const accessToken = doc.accessToken
    if (!accessToken) {
      return NextResponse.json({ error: 'Instance has no access token' }, { status: 400 })
    }
    if (doc.isActive === false) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const resultParams = new URLSearchParams(searchParams)
    resultParams.set('id', id)
    resultParams.set('token', accessToken)
    const resultRes = await fetch(`${base}/api/content-rank-result?${resultParams.toString()}`, {
      cache: 'no-store',
    })
    const data = await resultRes.json().catch(() => ({}))
    if (!resultRes.ok) {
      return NextResponse.json(data, { status: resultRes.status })
    }
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[content-rank/result]', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
