/**
 * Proxies to CMS platform-survey-config. Returns { title, sections } for a given company.
 * Query: ?company=COMPANY_ID (required). Title is the company name when that company has the survey enabled.
 */
const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const company = searchParams.get('company')?.trim()
    if (!company) {
      return Response.json({ error: 'company query param required' }, { status: 400 })
    }
    const base = CMS_URL.replace(/\/$/, '')
    const res = await fetch(`${base}/api/platform-survey-config?company=${encodeURIComponent(company)}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
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
