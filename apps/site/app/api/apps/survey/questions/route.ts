/**
 * Proxies to CMS platform-survey-questions/grouped using ACTIVITY_LINK_SECRET.
 * Used by the in-site survey at /dashboard/apps/survey.
 */
import { NextResponse } from 'next/server'
import { getCmsUrl } from '@repo/env'
import { createLogger } from '@repo/env'

const log = createLogger('survey/questions')

function surveyApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const secret = process.env.ACTIVITY_LINK_SECRET
  if (secret) headers['x-activity-app-secret'] = secret
  return headers
}

export async function GET() {
  try {
    const base = getCmsUrl()
    let res = await fetch(`${base}/api/platform-survey-questions/grouped`, {
      cache: 'no-store',
      headers: surveyApiHeaders(),
    })
    if (res.status === 404) {
      const alt = await fetch(`${base}/api/platform-survey-questions`, {
        cache: 'no-store',
        headers: surveyApiHeaders(),
      })
      if (alt.ok) res = alt
    }
    if (!res.ok) {
      const text = await res.text()
      log.error('CMS returned', res.status, text)
      return NextResponse.json({ sections: [] })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error(message)
    return NextResponse.json({ sections: [] })
  }
}
