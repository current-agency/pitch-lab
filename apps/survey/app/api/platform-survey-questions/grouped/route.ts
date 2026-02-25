/**
 * Same as /api/platform-survey-questions: proxies to CMS grouped endpoint.
 * Exists so that callers using the /grouped path (e.g. direct links or CMS-style URLs) get a 200 instead of 404.
 */
const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'

export async function GET() {
  try {
    const base = CMS_URL.replace(/\/$/, '')
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (process.env.PLATFORM_SURVEY_API_SECRET) headers['x-platform-survey-secret'] = process.env.PLATFORM_SURVEY_API_SECRET
    const res = await fetch(`${base}/api/platform-survey-questions/grouped`, {
      cache: 'no-store',
      headers,
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('[platform-survey-questions/grouped] CMS returned', res.status, text)
      return Response.json({ sections: [] })
    }
    const data = await res.json()
    return Response.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[platform-survey-questions/grouped]', message)
    return Response.json({ sections: [] })
  }
}
