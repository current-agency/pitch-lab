/**
 * Proxies to CMS content-rank-result. Uses cookie JWT to fetch the instance
 * and get accessToken server-side, then calls CMS so the client never sees the token.
 */
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getCmsUrl } from '@repo/env'
import { getToken } from '@/lib/auth'
import { apiError, apiUnauthorized } from '@/lib/api-response'
import { createLogger } from '@repo/env'

const log = createLogger('content-rank/result')

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const token = getToken(cookieStore)
  if (!token) {
    return NextResponse.json(apiUnauthorized(), { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json(apiError('id required'), { status: 400 })
  }

  try {
    const base = getCmsUrl()
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
      return NextResponse.json(apiError('Instance has no access token'), { status: 400 })
    }
    if (doc.isActive === false) {
      return NextResponse.json(apiError('Not found'), { status: 404 })
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
    log.error(message)
    return NextResponse.json(apiError('Failed to load result', message), { status: 502 })
  }
}
