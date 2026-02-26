/**
 * Proxies to CMS platform-survey-config. Returns { title, sections } for a given company.
 * Query: ?company=COMPANY_ID (required). Title is the company name when that company has the survey enabled.
 */
import { buildConfigUrl } from '../../../lib/survey-api'
import { requireEnv } from '../../../lib/env'

export async function GET(request: Request) {
  let cmsUrl: string
  try {
    cmsUrl = requireEnv('CMS_URL')
  } catch (e) {
    const message = e instanceof Error ? e.message : 'CMS_URL is required'
    return Response.json({ error: message }, { status: 503 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const company = searchParams.get('company')?.trim()
    if (!company) {
      return Response.json({ error: 'company query param required' }, { status: 400 })
    }
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (process.env.ACTIVITY_LINK_SECRET) headers['x-activity-app-secret'] = process.env.ACTIVITY_LINK_SECRET
    const res = await fetch(buildConfigUrl(cmsUrl, company), {
      cache: 'no-store',
      headers,
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('[platform-survey-config] CMS returned', res.status, text)
      return Response.json(
        { error: res.status === 404 ? 'Company not found or survey not enabled' : 'Failed to load survey', details: text },
        { status: res.status >= 500 ? 502 : res.status }
      )
    }
    const data = await res.json()
    return Response.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[platform-survey-config]', message)
    return Response.json(
      { error: 'Failed to load survey', details: message },
      { status: 502 }
    )
  }
}
