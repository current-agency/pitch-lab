import { NextResponse } from 'next/server'
import { getCmsUrl } from '@repo/env'
import { verifyStakeholderMapToken } from '../../../lib/verify-token'

function getCmsHeaders(): Record<string, string> {
  const secret = process.env.STAKEHOLDER_MAP_API_SECRET
  const out: Record<string, string> = {}
  if (secret) out['x-stakeholder-map-secret'] = secret
  return out
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get('company')
  const token = searchParams.get('token') ?? request.headers.get('x-stakeholder-map-token')
  if (!companyId) {
    return NextResponse.json({ error: 'company query param required' }, { status: 400 })
  }
  if (!token) {
    return NextResponse.json({ error: 'token required (query or header)' }, { status: 401 })
  }
  const userId = verifyStakeholderMapToken(token)
  if (!userId) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  const cmsUrl = getCmsUrl()
  const url = `${cmsUrl}/api/stakeholders?where[company][equals]=${encodeURIComponent(companyId)}&limit=100&depth=0`
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', ...getCmsHeaders() },
      next: { revalidate: 0 },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message =
        res.status === 403
          ? 'CMS denied access. Set STAKEHOLDER_MAP_API_SECRET to the same value in both the CMS app and this app (stakeholder-map), then restart both.'
          : (data as { errors?: { message?: string }[] })?.errors?.[0]?.message ?? 'Failed to fetch stakeholders'
      return NextResponse.json(
        { error: message },
        { status: res.status >= 500 ? 502 : res.status },
      )
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('[stakeholder-map /api/stakeholders]', err)
    return NextResponse.json({ error: 'Failed to fetch stakeholders' }, { status: 502 })
  }
}
