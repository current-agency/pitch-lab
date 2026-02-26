/**
 * One-time migration: convert assignedApplications from legacy format (array of IDs)
 * to polymorphic format [{ relationTo: 'image-choice-assessments', value: id }, ...].
 * Run after changing Users.assignedApplications to relationTo: ['image-choice-assessments', 'audience-poker-activities'].
 *
 * Run from apps/cms: pnpm exec tsx scripts/migrate-assigned-applications-polymorphic.ts
 * Or from repo root: pnpm --filter @repo/cms exec tsx scripts/migrate-assigned-applications-polymorphic.ts
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

function isPolymorphic(raw: unknown): raw is { relationTo: string; value: unknown }[] {
  return (
    Array.isArray(raw) &&
    raw.length > 0 &&
    typeof (raw[0] as { relationTo?: string })?.relationTo === 'string' &&
    (raw[0] as { value?: unknown }).value != null
  )
}

async function main() {
  const payload = await getPayload({ config })

  const users = await payload.find({
    collection: 'users',
    limit: 2000,
    depth: 0,
    overrideAccess: true,
  })

  let updated = 0
  for (const user of users.docs) {
    const u = user as { id: string; assignedApplications?: unknown }
    const raw = u.assignedApplications
    if (raw == null || !Array.isArray(raw) || raw.length === 0) continue
    if (isPolymorphic(raw)) continue

    const polymorphic = (raw as unknown[]).map((id) => ({
      relationTo: 'image-choice-assessments' as const,
      value: typeof id === 'string' ? id : String(id),
    }))

    try {
      await payload.update({
        collection: 'users',
        id: u.id,
        data: { assignedApplications: polymorphic },
        overrideAccess: true,
      })
      updated++
      console.log(`Migrated user ${u.id}: ${raw.length} assignment(s)`)
    } catch (err: unknown) {
      const validationErrors = err && typeof err === 'object' && 'data' in err
        ? (err as { data?: { errors?: unknown } }).data?.errors
        : null
      console.error(`Failed user ${u.id}:`, validationErrors ?? err)
      throw err
    }
  }

  console.log(`Done. Updated ${updated} user(s).`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
