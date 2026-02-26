import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from '@/lib/auth'

const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'

export async function GET() {
  const cookieStore = await cookies()
  const token = getToken(cookieStore)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = `${CMS_URL}/api/image-choice-assessments?where[isActive][equals]=true&limit=100&sort=-updatedAt`
    const res = await fetch(url, {
      headers: { Accept: 'application/json', Authorization: `JWT ${token}` },
      next: { revalidate: 0 },
    })
    const data = await res.json().catch(() => ({ docs: [] }))
    if (!res.ok) {
      return NextResponse.json(
        { error: (data as { message?: string }).message || 'Failed to load assessments' },
        { status: res.status >= 500 ? 502 : res.status },
      )
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('[site /api/apps/image-choice/assessments]', err)
    return NextResponse.json({ error: 'Failed to load assessments' }, { status: 502 })
  }
}
