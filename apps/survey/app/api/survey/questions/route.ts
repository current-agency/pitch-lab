/**
 * Proxies to CMS grouped platform-survey-questions.
 * Alternate path in case /api/platform-survey-questions fails to match in dev.
 */
const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'

export async function GET() {
  try {
    const base = CMS_URL.replace(/\/$/, '')
    const res = await fetch(`${base}/api/platform-survey-questions/grouped`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('[survey/questions] CMS returned', res.status, text)
      return Response.json(
        { error: 'Failed to load questions', details: res.status === 404 ? 'CMS endpoint not found. Is the CMS running?' : text },
        { status: res.status >= 500 ? 502 : res.status }
      )
    }
    const data = await res.json()
    return Response.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[survey/questions]', message)
    return Response.json(
      { error: 'Failed to load questions', details: message },
      { status: 502 }
    )
  }
}
