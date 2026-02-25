/**
 * Seed platform-survey-questions from apps/cms/seed/platform-survey-questions.ts
 * Run from repo root: pnpm --filter @repo/cms exec tsx scripts/seed-platform-survey-questions.ts
 * Or from apps/cms: pnpm exec tsx scripts/seed-platform-survey-questions.ts
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { platformSurveyQuestionsSeed } from '../seed/platform-survey-questions'

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await payload.create({ collection, data: { ...q, required: q.required ?? true, isActive: q.isActive ?? true } as any, draft: false, overrideAccess: true })
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
