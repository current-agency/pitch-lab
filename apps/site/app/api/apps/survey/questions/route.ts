/**
 * Proxies to CMS platform-survey-questions/grouped using ACTIVITY_LINK_SECRET.
 * Used by the in-site survey at /dashboard/apps/survey.
 */
import { NextResponse } from 'next/server'

const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'

function surveyApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const secret = process.env.ACTIVITY_LINK_SECRET
  if (secret) headers['x-activity-app-secret'] = secret
  return headers
}

export async function GET() {
  try {
    const base = CMS_URL.replace(/\/$/, '')
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
      console.error('[survey/questions] CMS returned', res.status, text)
      return NextResponse.json({ sections: [] })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[survey/questions]', message)
    return NextResponse.json({ sections: [] })
  }
}
