/**
 * Served at /api/platform-survey-questions/grouped (root app/api, not under Payload catch-all).
 */
import { getGroupedQuestions } from '../../../../lib/platform-survey-api'

export async function GET() {
  try {
    const data = await getGroupedQuestions()
    return Response.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[platform-survey-questions/grouped]', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
