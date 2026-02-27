/**
 * Proxies to CMS platform-survey-config using ACTIVITY_LINK_SECRET.
 * Query: ?company=COMPANY_ID
 */
import { NextResponse } from 'next/server'
import { getCmsUrl } from '@repo/env'
import { apiError } from '@/lib/api-response'
import { createLogger } from '@repo/env'

const log = createLogger('survey/config')

function surveyApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const secret = process.env.ACTIVITY_LINK_SECRET
  if (secret) headers['x-activity-app-secret'] = secret
  return headers
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const company = searchParams.get('company')?.trim()
  if (!company) {
    return NextResponse.json(apiError('company query param required'), { status: 400 })
  }
  try {
    const base = getCmsUrl()
    const res = await fetch(`${base}/api/platform-survey-config?company=${encodeURIComponent(company)}`, {
      cache: 'no-store',
      headers: surveyApiHeaders(),
    })
    if (!res.ok) {
      const text = await res.text()
      log.error('CMS returned', res.status, text)
      return NextResponse.json(
        apiError(res.status === 404 ? 'Company not found or survey not enabled' : 'Failed to load survey', text),
        { status: res.status >= 500 ? 502 : res.status }
      )
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error(message)
    return NextResponse.json(apiError('Failed to load survey', message), { status: 502 })
  }
}
