import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCmsUrl } from '@repo/env'
import { getToken } from '@/lib/auth'
import { apiError, apiUnauthorized } from '@/lib/api-response'
import { createLogger } from '@repo/env'

const log = createLogger('image-choice/assessments')

export async function GET() {
  const cookieStore = await cookies()
  const token = getToken(cookieStore)
  if (!token) return NextResponse.json(apiUnauthorized(), { status: 401 })

  try {
    const base = getCmsUrl()
    const url = `${base}/api/image-choice-assessments?where[isActive][equals]=true&limit=100&sort=-updatedAt`
    const res = await fetch(url, {
      headers: { Accept: 'application/json', Authorization: `JWT ${token}` },
      next: { revalidate: 0 },
    })
    const data = await res.json().catch(() => ({ docs: [] }))
    if (!res.ok) {
      return NextResponse.json(
        apiError((data as { message?: string }).message || 'Failed to load assessments'),
        { status: res.status >= 500 ? 502 : res.status },
      )
    }
    return NextResponse.json(data)
  } catch (err) {
    log.error(err)
    return NextResponse.json(apiError('Failed to load assessments'), { status: 502 })
  }
}
