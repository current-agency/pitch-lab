import { NextResponse } from 'next/server'

const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'

export async function GET() {
  try {
    const url = `${CMS_URL}/api/image-choice-assessments?where[isActive][equals]=true&limit=100&sort=-updatedAt`
    const res = await fetch(url, { next: { revalidate: 0 } })

    const text = await res.text()
    if (!res.ok) {
      console.error('[image-choice /api/assessments] CMS error:', res.status, url, text)
      const message =
        res.status === 500
          ? 'CMS returned an error. Check that the CMS is running (e.g. port 3001) and the database is available.'
          : text || res.statusText
      return NextResponse.json({ error: message }, { status: 502 })
    }

    let data: unknown
    try {
      data = text ? JSON.parse(text) : { docs: [] }
    } catch {
      console.error('[image-choice /api/assessments] CMS returned non-JSON:', text.slice(0, 200))
      return NextResponse.json(
        { error: 'Invalid response from CMS' },
        { status: 502 },
      )
    }
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[image-choice /api/assessments]', message, err)
    return NextResponse.json(
      {
        error:
          message.includes('fetch') || message.includes('ECONNREFUSED')
            ? 'Cannot reach CMS. Start the CMS app (e.g. pnpm --filter cms dev on port 3001) and ensure CMS_URL is correct.'
            : `Failed to load assessments: ${message}`,
      },
      { status: 502 },
    )
  }
}
