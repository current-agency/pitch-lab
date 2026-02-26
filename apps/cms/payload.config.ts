import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { buildConfig } from 'payload'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { Companies } from './collections/Companies'
import { ContentRank } from './collections/ContentRank'
import { ImageChoiceAssessments } from './collections/ImageChoiceAssessments'
import { ImageChoiceResponses } from './collections/ImageChoiceResponses'
import { AudiencePokerActivities } from './collections/AudiencePokerActivities'
import { AudiencePokerSubmissions } from './collections/AudiencePokerSubmissions'
import { Media } from './collections/Media'
import { MigrationReviewSession, generateSessionId } from './collections/MigrationReviewSession'
import { PlatformSurveyQuestions } from './collections/PlatformSurveyQuestions'
import { PlatformSurveyResponses } from './collections/PlatformSurveyResponses'
import { Users } from './collections/Users'
import { Faqs } from './collections/Faqs'
import { StakeholderMapActivities } from './collections/StakeholderMapActivities'
import { StakeholderMapSubmissions } from './collections/StakeholderMapSubmissions'
import { SECTION_LABELS, sortGroupedSections } from './lib/platform-survey-section-order'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Required for production: OG images, API, login. Set PAYLOAD_PUBLIC_SERVER_URL to your canonical URL (e.g. https://pitch-lab-cms.vercel.app) so OG requests are same-origin and not blocked by CORS.
const serverURL =
  process.env.PAYLOAD_PUBLIC_SERVER_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
  'http://localhost:3001'

const payloadSecret = process.env.PAYLOAD_SECRET
if (process.env.NODE_ENV === 'production' && (!payloadSecret || payloadSecret === 'change-me-in-production')) {
  throw new Error(
    'PAYLOAD_SECRET must be set to a secure random value in production. Do not use the default. See apps/cms/.env.example.'
  )
}

export default buildConfig({
  serverURL,
  endpoints: [
    {
      path: '/content-rank-by-token',
      method: 'get',
      handler: async (req) => {
        const url = new URL(req.url || '', 'http://localhost')
        const id = url.searchParams.get('id')
        const token = url.searchParams.get('token')
        if (!id || !token) {
          return Response.json({ error: 'id and token required' }, { status: 400 })
        }
        const doc = await req.payload.findByID({
          collection: 'content-rank',
          id,
          overrideAccess: true,
        })
        if (!doc || (doc as { accessToken?: string }).accessToken !== token) {
          return Response.json({ error: 'Not found' }, { status: 404 })
        }
        if (!(doc as { isActive?: boolean }).isActive) {
          return Response.json({ error: 'Not found' }, { status: 404 })
        }
        return Response.json(doc)
      },
    },
    {
      path: '/platform-survey-questions/grouped',
      method: 'get',
      handler: async (req) => {
        try {
          const secret = process.env.ACTIVITY_LINK_SECRET
          if (secret && req.headers?.get?.('x-activity-app-secret') !== secret) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
          }
          const result = await req.payload.find({
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
          for (const section of sections.values()) {
            section.questions.sort((a, b) => ((a as { order?: number }).order ?? 0) - ((b as { order?: number }).order ?? 0))
          }
          const grouped = sortGroupedSections(Array.from(sections.values()))
          return Response.json({ sections: grouped })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          console.error('[platform-survey-questions/grouped]', message)
          return Response.json({ error: message }, { status: 500 })
        }
      },
    },
    {
      path: '/platform-survey-config',
      method: 'get',
      handler: async (req) => {
        try {
          const secret = process.env.ACTIVITY_LINK_SECRET
          if (secret && req.headers?.get?.('x-activity-app-secret') !== secret) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
          }
          const url = new URL(req.url || '', 'http://localhost')
          const companyId = url.searchParams.get('company')?.trim()
          if (!companyId) {
            return Response.json({ error: 'company query param required' }, { status: 400 })
          }
          const company = await req.payload.findByID({
            collection: 'companies',
            id: companyId,
            depth: 0,
            overrideAccess: true,
          }) as { name?: string; platformSurveyEnabled?: boolean } | null
          if (!company || !company.platformSurveyEnabled) {
            return Response.json({ error: 'Company not found or survey not enabled for this company' }, { status: 404 })
          }
          const companyName = typeof company.name === 'string' && company.name.trim() ? company.name.trim() : ''
          if (!companyName) {
            return Response.json({ error: 'Company name not set' }, { status: 404 })
          }
          const result = await req.payload.find({
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
          for (const section of sections.values()) {
            section.questions.sort((a, b) => ((a as { order?: number }).order ?? 0) - ((b as { order?: number }).order ?? 0))
          }
          const grouped = sortGroupedSections(Array.from(sections.values()))
          return Response.json({ title: companyName, sections: grouped })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          console.error('[platform-survey-config]', message)
          return Response.json({ error: message }, { status: 500 })
        }
      },
    },
    {
      path: '/api/migration-session',
      method: 'get',
      handler: async (req) => {
        try {
          const secret = process.env.MIGRATION_SESSION_API_SECRET
          if (!secret || req.headers?.get?.('x-migration-session-secret') !== secret) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
          }
          const url = new URL(req.url || '', 'http://localhost')
          const sessionId = url.searchParams.get('sessionId')?.trim()
          const email = url.searchParams.get('email')?.trim()
          if (!sessionId && !email) {
            return Response.json({ error: 'sessionId or email required' }, { status: 400 })
          }
          const payload = req.payload
          if (sessionId) {
            const result = await payload.find({
              collection: 'migration-review-sessions',
              where: { sessionId: { equals: sessionId } },
              limit: 1,
              overrideAccess: true,
            })
            const doc = result.docs[0]
            if (!doc) return Response.json({ error: 'Session not found' }, { status: 404 })
            const d = doc as { email: string; sessionId: string; dataVersion?: string; decisions?: unknown }
            return Response.json({
              sessionId: d.sessionId,
              email: d.email,
              dataVersion: d.dataVersion ?? null,
              decisions: d.decisions ?? {},
            })
          }
          const result = await payload.find({
            collection: 'migration-review-sessions',
            where: { email: { equals: email } },
            sort: '-updatedAt',
            limit: 1,
            overrideAccess: true,
          })
          const doc = result.docs[0]
          if (!doc) return Response.json({ error: 'Session not found' }, { status: 404 })
          const d = doc as { email: string; sessionId: string; dataVersion?: string; decisions?: unknown }
          return Response.json({
            sessionId: d.sessionId,
            email: d.email,
            dataVersion: d.dataVersion ?? null,
            decisions: d.decisions ?? {},
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          console.error('[migration-session GET]', message)
          return Response.json(
            { error: 'Migration session fetch failed', details: message },
            { status: 500 }
          )
        }
      },
    },
    {
      path: '/api/migration-session',
      method: 'post',
      handler: async (req) => {
        try {
          const secret = process.env.MIGRATION_SESSION_API_SECRET
          if (!secret || req.headers?.get?.('x-migration-session-secret') !== secret) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
          }
          let body: { email?: string; sessionId?: string; dataVersion?: string; decisions?: Record<string, { client_decision: string; notes: string }> } | null = null
          if (typeof (req as Request).json === 'function') {
            body = await (req as Request).json()
          } else if ((req as { body?: unknown }).body) {
            body = (req as { body: typeof body }).body
          }
          if (!body || typeof body !== 'object') {
            return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
          }
          const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : null
          if (!email) return Response.json({ error: 'email required' }, { status: 400 })
          const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() || null : null
          const dataVersion = typeof body.dataVersion === 'string' ? body.dataVersion.trim() || null : null
          const decisions = body.decisions && typeof body.decisions === 'object' ? body.decisions : null
          const payload = req.payload

          if (sessionId) {
            const existing = await payload.find({
              collection: 'migration-review-sessions',
              where: { sessionId: { equals: sessionId } },
              limit: 1,
              overrideAccess: true,
            })
            const doc = existing.docs[0]
            if (doc) {
              await payload.update({
                collection: 'migration-review-sessions',
                id: doc.id,
                data: {
                  ...(dataVersion != null && { dataVersion }),
                  ...(decisions != null && { decisions }),
                },
                draft: false,
                overrideAccess: true,
              })
              const d = doc as { sessionId: string; email: string }
              return Response.json({ sessionId: d.sessionId, email: d.email })
            }
          }

          const existingByEmail = await payload.find({
            collection: 'migration-review-sessions',
            where: { email: { equals: email } },
            sort: '-updatedAt',
            limit: 1,
            overrideAccess: true,
          })
          const existingDoc = existingByEmail.docs[0]
          if (existingDoc) {
            await payload.update({
              collection: 'migration-review-sessions',
              id: existingDoc.id,
              data: {
                ...(dataVersion != null && { dataVersion }),
                ...(decisions != null && { decisions }),
              },
              draft: false,
              overrideAccess: true,
            })
            const d = existingDoc as { sessionId: string; email: string }
            return Response.json({ sessionId: d.sessionId, email: d.email })
          }

          const created = await payload.create({
            collection: 'migration-review-sessions',
            data: {
              email,
              sessionId: generateSessionId(),
              dataVersion: dataVersion ?? undefined,
              decisions: decisions ?? undefined,
            },
            draft: false,
            overrideAccess: true,
          })
          const d = created as { sessionId: string; email: string }
          return Response.json({ sessionId: d.sessionId, email: d.email })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          const stack = err instanceof Error ? err.stack : undefined
          console.error('[migration-session POST]', message, stack)
          return Response.json(
            { error: 'Migration session update failed', details: message },
            { status: 500 }
          )
        }
      },
    },
  ],
  admin: {
    meta: {
      titleSuffix: ' | Site CMS',
    },
    // Avoid hydration warnings when browser extensions (e.g. cz-shortcut-listen) modify <body>
    suppressHydrationWarning: true,
  },
  collections: [Companies, Users, Media, ImageChoiceAssessments, ImageChoiceResponses, AudiencePokerActivities, AudiencePokerSubmissions, ContentRank, MigrationReviewSession, PlatformSurveyQuestions, PlatformSurveyResponses, Faqs, StakeholderMapActivities, StakeholderMapSubmissions],
  plugins: [
    // Use Vercel Blob in production so uploads work (serverless filesystem is read-only). Set BLOB_READ_WRITE_TOKEN in Vercel.
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: { media: true },
      token: process.env.BLOB_READ_WRITE_TOKEN,
      clientUploads: true, // Bypass Vercel 4.5MB server upload limit
    }),
  ],
  editor: lexicalEditor(),
  secret: payloadSecret || 'change-me-in-production',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/payload-turbo',
    connectOptions: {
      serverSelectionTimeoutMS: 15000,
      // Prefer TLS 1.2+ for Atlas (avoids TLS "internal error" from serverless runtimes)
      ...(process.env.DATABASE_URI?.startsWith('mongodb+srv://') || process.env.MONGODB_URI?.startsWith('mongodb+srv://')
        ? { tls: true }
        : {}),
    },
    // Disable transactions to avoid "Write conflict during plan execution" on Atlas (M0/shared tier)
    transactionOptions: false,
  }),
  sharp,
})
