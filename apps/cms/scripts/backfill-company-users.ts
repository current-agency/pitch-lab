/**
 * One-time backfill: set each company's users array from the User collection (users where company = that company).
 * Run from apps/cms: pnpm exec tsx scripts/backfill-company-users.ts
 * Or from repo root: pnpm --filter @repo/cms exec tsx scripts/backfill-company-users.ts
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

async function main() {
  const payload = await getPayload({ config })

  const users = await payload.find({
    collection: 'users',
    limit: 2000,
    depth: 0,
    overrideAccess: true,
  })

  const byCompany = new Map<string, string[]>()
  for (const user of users.docs) {
    const u = user as { id: string; company?: string | { id: string } }
    const companyId = typeof u.company === 'object' && u.company?.id ? u.company.id : typeof u.company === 'string' ? u.company : null
    if (!companyId) continue
    if (!byCompany.has(companyId)) byCompany.set(companyId, [])
    byCompany.get(companyId)!.push(u.id)
  }

  const companies = await payload.find({
    collection: 'companies',
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })

  let updated = 0
  for (const company of companies.docs) {
    const id = (company as { id: string }).id
    const userIds = byCompany.get(id) ?? []
    await payload.update({
      collection: 'companies',
      id,
      data: { users: userIds },
      overrideAccess: true,
    })
    updated++
  }

  console.log(`Backfilled users for ${updated} companies.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
