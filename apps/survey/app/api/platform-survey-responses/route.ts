/**
 * Forwards platform survey submissions to the CMS (platform-survey-responses collection).
 * CMS allows create without auth for this collection.
 */
const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      respondent?: { name?: string; email?: string; company?: string }
      answers: Record<string, unknown>
      completionTime?: number
      company?: string
    }
    const base = CMS_URL.replace(/\/$/, '')
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' }
    if (process.env.PLATFORM_SURVEY_API_SECRET) headers['x-platform-survey-secret'] = process.env.PLATFORM_SURVEY_API_SECRET
    const res = await fetch(`${base}/api/platform-survey-responses`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        respondent: body.respondent ?? {},
        answers: body.answers,
        completionTime: body.completionTime,
        company: body.company ?? null,
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('[platform-survey-responses] CMS returned', res.status, text)
      return Response.json(
        { error: 'Failed to save response', details: text },
        { status: res.status >= 500 ? 502 : res.status }
      )
    }
    const data = await res.json()
    return Response.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[platform-survey-responses]', message)
    return Response.json(
      { error: 'Failed to save response', details: message },
      { status: 502 }
    )
  }
}
