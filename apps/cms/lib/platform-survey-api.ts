/**
 * Platform survey API handlers. Used by Next.js API routes so the endpoints
 * are reachable at /api/platform-survey-questions/grouped and /api/platform-survey-config.
 */
import { getPayload } from 'payload'
import config from '@payload-config'
import { SECTION_LABELS, sortGroupedSections } from './platform-survey-section-order'

export async function getGroupedQuestions() {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'platform-survey-questions',
    where: { isActive: { equals: true } },
    sort: 'section,order',
    limit: 500,
    overrideAccess: true,
  })
  const sections = new Map<string, { sectionLabel: string; section: string; questions: typeof result.docs }>()
  for (const doc of result.docs) {
    const d = doc as { section: string }
    const key = d.section
    if (!sections.has(key)) {
      sections.set(key, { section: key, sectionLabel: SECTION_LABELS[key] ?? key, questions: [] })
    }
    sections.get(key)!.questions.push(doc)
  }
  // Sort questions within each section by the CMS order field
  for (const section of sections.values()) {
    section.questions.sort((a, b) => {
      const aOrder = (a as { order?: number }).order ?? 0
      const bOrder = (b as { order?: number }).order ?? 0
      return aOrder - bOrder
    })
  }
  const grouped = sortGroupedSections(Array.from(sections.values()))
  return { sections: grouped }
}

/** Returns survey config (title + sections) for a company when that company has the survey enabled. */
export async function getSurveyConfigByCompany(companyId: string) {
  const payload = await getPayload({ config })
  const company = (await payload.findByID({
    collection: 'companies',
    id: companyId,
    depth: 0,
    overrideAccess: true,
  })) as { name?: string; platformSurveyEnabled?: boolean } | null
  if (!company || !company.platformSurveyEnabled) return null
  const companyName = typeof company.name === 'string' && company.name.trim() ? company.name.trim() : ''
  if (!companyName) return null
  const { sections } = await getGroupedQuestions()
  return { title: companyName, sections }
}
