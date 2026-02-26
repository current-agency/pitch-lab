/**
 * Seed platform-survey-questions from apps/cms/seed/platform-survey-questions.ts
 * Run from repo root: pnpm --filter @repo/cms exec tsx scripts/seed-platform-survey-questions.ts
 * Or from apps/cms: pnpm exec tsx scripts/seed-platform-survey-questions.ts
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import type { PlatformSurveyQuestion } from '../payload-types'
import { platformSurveyQuestionsSeed } from '../seed/platform-survey-questions'

const SECTION_ORDER: string[] = [
  'content-complexity',
  'editor-autonomy',
  'marketing-personalization',
  'integration-ecosystem',
  'team-resources',
  'scale-performance',
  'budget-timeline',
  'future-vision',
  'day-in-the-life',
  'workflow-builder',
  'who-does-what',
  'current-platform',
  'future-state-wishlist',
]

function sectionSortOrder(section: string): number {
  const i = SECTION_ORDER.indexOf(section)
  return i === -1 ? 999 : i
}

/** Data for creating a platform survey question; section/sectionSortOrder aligned with collection. */
type CreateData = Omit<PlatformSurveyQuestion, 'id' | 'createdAt' | 'updatedAt'>

async function main() {
  const payload = await getPayload({ config })
  const collection = 'platform-survey-questions'
  const existing = await payload.find({
    collection,
    limit: 1000,
    overrideAccess: true,
  })
  const existingKeys = new Set(
    existing.docs.map((d) => (d as { questionKey: string }).questionKey)
  )

  let created = 0
  let skipped = 0
  for (const q of platformSurveyQuestionsSeed) {
    if (existingKeys.has(q.questionKey)) {
      skipped++
      continue
    }
    const data = {
      ...q,
      sectionSortOrder: sectionSortOrder(q.section),
      required: q.required ?? true,
      isActive: q.isActive ?? true,
    } as CreateData
    await payload.create({ collection, data, draft: false, overrideAccess: true })
    created++
    console.log(`Created: ${q.questionKey}`)
  }

  console.log(`Done. Created ${created}, skipped ${skipped} (already exist).`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
