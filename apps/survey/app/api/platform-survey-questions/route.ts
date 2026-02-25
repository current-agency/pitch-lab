/**
 * Proxies to CMS grouped platform-survey-questions endpoint.
 * Uses CMS_URL server-side so the frontend does not need to know the CMS origin.
 * On CMS 404/502, returns 200 with empty sections so the survey page still loads (shows "No questions available").
 */
const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'

async function fetchFromCms(base: string): Promise<Response> {
  return fetch(`${base}/api/platform-survey-questions/grouped`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
}

export async function GET() {
  try {
    const base = CMS_URL.replace(/\/$/, '')
    let res = await fetchFromCms(base)
    // If 404, try path without /grouped (some Payload setups mount custom endpoints differently)
    if (res.status === 404) {
      const alt = await fetch(`${base}/api/platform-survey-questions`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })
      if (alt.ok) res = alt
    }
    if (!res.ok) {
      const text = await res.text()
      console.error('[platform-survey-questions] CMS returned', res.status, text)
      // Return 200 with empty sections so the survey page loads instead of showing 404
      return Response.json({ sections: [] })
    }
    const data = await res.json()
    return Response.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[platform-survey-questions]', message)
    // Return 200 with empty sections so the survey page loads
    return Response.json({ sections: [] })
  }
}
