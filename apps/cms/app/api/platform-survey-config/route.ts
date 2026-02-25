/**
 * Served at /api/platform-survey-config (root app/api, not under Payload catch-all).
 * Query: ?company=COMPANY_ID. Returns { title, sections } when that company has the survey enabled.
 */
import { NextRequest } from 'next/server'
import { getSurveyConfigByCompany } from '../../../lib/platform-survey-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('company')?.trim()
    if (!companyId) {
      return Response.json({ error: 'company query param required' }, { status: 400 })
    }
    const data = await getSurveyConfigByCompany(companyId)
    if (!data) {
      return Response.json(
        { error: 'Company not found or survey not enabled for this company' },
        { status: 404 }
      )
    }
    return Response.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[platform-survey-config]', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
