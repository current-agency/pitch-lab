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

/** In production, survey proxy endpoints require ACTIVITY_LINK_SECRET; return 503 if missing. */
function requireActivitySecretInProduction(): Response | null {
  if (process.env.NODE_ENV === 'production' && !process.env.ACTIVITY_LINK_SECRET) {
    return Response.json(
      { error: 'Survey API not configured. Set ACTIVITY_LINK_SECRET in production.' },
      { status: 503 }
    )
  }
  return null
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
      path: '/dashboard-completions',
      method: 'get',
      handler: async (req) => {
        const user = req.user as { id?: string } | undefined
        if (!user?.id) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const userId = user.id
        try {
          const [imageChoiceRes, audiencePokerRes, stakeholderMapRes, surveyRes] = await Promise.all([
            req.payload.find({
              collection: 'image-choice-responses',
              where: { user: { equals: userId } },
              limit: 500,
              depth: 0,
              overrideAccess: true,
            }),
            req.payload.find({
              collection: 'audience-poker-submissions',
              where: { user: { equals: userId } },
              limit: 500,
              depth: 0,
              overrideAccess: true,
            }),
            req.payload.find({
              collection: 'stakeholder-map-submissions',
              where: { submittedBy: { equals: userId } },
              limit: 500,
              depth: 0,
            }),
            req.payload.find({
              collection: 'platform-survey-responses',
              where: { user: { equals: userId } },
              limit: 1,
              depth: 0,
              overrideAccess: true,
            }),
          ])
          const imageChoiceAssessmentIds = imageChoiceRes.docs.map((d) => {
            const a = (d as { assessment?: string | { id: string } }).assessment
            return typeof a === 'object' && a?.id ? a.id : typeof a === 'string' ? a : ''
          }).filter(Boolean)
          const audiencePokerActivityIds = audiencePokerRes.docs.map((d) => {
            const a = (d as { activity?: string | { id: string } }).activity
            return typeof a === 'object' && a?.id ? a.id : typeof a === 'string' ? a : ''
          }).filter(Boolean)
          const stakeholderMapActivityIds = stakeholderMapRes.docs.map((d) => {
            const a = (d as { activity?: string | { id: string } }).activity
            return typeof a === 'object' && a?.id ? a.id : typeof a === 'string' ? a : ''
          }).filter(Boolean)
          const surveyCompleted = surveyRes.docs.length > 0
          return Response.json({
            imageChoiceAssessmentIds: [...new Set(imageChoiceAssessmentIds)],
            audiencePokerActivityIds: [...new Set(audiencePokerActivityIds)],
            stakeholderMapActivityIds: [...new Set(stakeholderMapActivityIds)],
            surveyCompleted,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          console.error('[dashboard-completions]', message)
          return Response.json({ error: message }, { status: 500 })
        }
      },
    },
    {
      path: '/user-activity-completions',
      method: 'get',
      handler: async (req) => {
        const user = req.user as { userType?: string; id?: string } | undefined
        if (user?.userType !== 'admin') {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }
        const url = new URL(req.url || '', 'http://localhost')
        const userId = url.searchParams.get('userId')?.trim()
        if (!userId) {
          return Response.json({ error: 'userId query required' }, { status: 400 })
        }
        try {
          const [imageChoiceRes, audiencePokerRes, stakeholderMapRes, surveyRes] = await Promise.all([
            req.payload.find({
              collection: 'image-choice-responses',
              where: { user: { equals: userId } },
              limit: 500,
              depth: 1,
              overrideAccess: true,
            }),
            req.payload.find({
              collection: 'audience-poker-submissions',
              where: { user: { equals: userId } },
              limit: 500,
              depth: 1,
              overrideAccess: true,
            }),
            req.payload.find({
              collection: 'stakeholder-map-submissions',
              where: { submittedBy: { equals: userId } },
              limit: 500,
              depth: 1,
              overrideAccess: true,
            }),
            req.payload.find({
              collection: 'platform-survey-responses',
              where: { user: { equals: userId } },
              limit: 10,
              depth: 0,
              overrideAccess: true,
            }),
          ])
          type Item = { type: string; entityId: string; title: string; submissionId: string }
          const items: Item[] = []
          for (const d of imageChoiceRes.docs) {
            const doc = d as { id: string; assessment?: string | { id: string; title?: string } }
            const a = doc.assessment
            const id = typeof a === 'object' && a?.id ? a.id : typeof a === 'string' ? a : ''
            const title = typeof a === 'object' && a?.title ? String(a.title) : id || 'Image choice'
            items.push({ type: 'image-choice', entityId: id, title, submissionId: doc.id })
          }
          for (const d of audiencePokerRes.docs) {
            const doc = d as { id: string; activity?: string | { id: string; title?: string } }
            const a = doc.activity
            const id = typeof a === 'object' && a?.id ? a.id : typeof a === 'string' ? a : ''
            const title = typeof a === 'object' && a?.title ? String(a.title) : id || 'Audience Poker'
            items.push({ type: 'audience-poker', entityId: id, title, submissionId: doc.id })
          }
          for (const d of stakeholderMapRes.docs) {
            const doc = d as { id: string; activity?: string | { id: string; title?: string } }
            const a = doc.activity
            const id = typeof a === 'object' && a?.id ? a.id : typeof a === 'string' ? a : ''
            const title = typeof a === 'object' && a?.title ? String(a.title) : id || 'Stakeholder Map'
            items.push({ type: 'stakeholder-map', entityId: id, title, submissionId: doc.id })
          }
          for (const d of surveyRes.docs) {
            const doc = d as { id: string }
            items.push({ type: 'survey', entityId: 'survey', title: 'Platform Fit', submissionId: doc.id })
          }
          return Response.json({ items })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          console.error('[user-activity-completions]', message)
          return Response.json({ error: message }, { status: 500 })
        }
      },
    },
    {
      path: '/reset-user-activity',
      method: 'post',
      handler: async (req) => {
        const user = req.user as { userType?: string; id?: string } | undefined
        if (user?.userType !== 'admin') {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }
        let body: { userId?: string; activityType?: string; entityId?: string; submissionId?: string } | null = null
        if (typeof (req as Request).json === 'function') {
          body = await (req as Request).json()
        } else if ((req as { body?: unknown }).body) {
          body = (req as { body: typeof body }).body
        }
        if (!body || typeof body !== 'object' || typeof body.userId !== 'string' || !body.userId.trim()) {
          return Response.json({ error: 'userId required' }, { status: 400 })
        }
        const userId = body.userId.trim()
        const activityType = typeof body.activityType === 'string' ? body.activityType.trim() : ''
        const entityId = typeof body.entityId === 'string' ? body.entityId.trim() : ''
        const submissionId = typeof body.submissionId === 'string' ? body.submissionId.trim() : ''
        try {
          if (submissionId) {
            if (activityType === 'image-choice') {
              await req.payload.delete({
                collection: 'image-choice-responses',
                id: submissionId,
                overrideAccess: true,
              })
            } else if (activityType === 'audience-poker') {
              await req.payload.delete({
                collection: 'audience-poker-submissions',
                id: submissionId,
                overrideAccess: true,
              })
            } else if (activityType === 'stakeholder-map') {
              await req.payload.delete({
                collection: 'stakeholder-map-submissions',
                id: submissionId,
                overrideAccess: true,
              })
            } else if (activityType === 'survey') {
              await req.payload.delete({
                collection: 'platform-survey-responses',
                id: submissionId,
                overrideAccess: true,
              })
            } else {
              return Response.json({ error: 'Invalid activityType when using submissionId' }, { status: 400 })
            }
            return Response.json({ ok: true })
          }
          if (!activityType) {
            return Response.json({ error: 'activityType or submissionId required' }, { status: 400 })
          }
          if (activityType === 'survey') {
            const res = await req.payload.find({
              collection: 'platform-survey-responses',
              where: { user: { equals: userId } },
              limit: 1,
              depth: 0,
              overrideAccess: true,
            })
            if (res.docs.length > 0) {
              const doc = res.docs[0]
              if (doc?.id) {
                await req.payload.delete({
                  collection: 'platform-survey-responses',
                  id: doc.id,
                  overrideAccess: true,
                })
              }
            }
            return Response.json({ ok: true })
          }
          if (!entityId) {
            return Response.json({ error: 'entityId required for this activity type' }, { status: 400 })
          }
          if (activityType === 'image-choice') {
            const res = await req.payload.find({
              collection: 'image-choice-responses',
              where: { user: { equals: userId }, assessment: { equals: entityId } },
              limit: 1,
              depth: 0,
              overrideAccess: true,
            })
            if (res.docs.length > 0) {
              const doc = res.docs[0]
              if (doc?.id) {
                await req.payload.delete({
                  collection: 'image-choice-responses',
                  id: doc.id,
                  overrideAccess: true,
                })
              }
            }
            return Response.json({ ok: true })
          }
          if (activityType === 'audience-poker') {
            const res = await req.payload.find({
              collection: 'audience-poker-submissions',
              where: { user: { equals: userId }, activity: { equals: entityId } },
              limit: 1,
              depth: 0,
              overrideAccess: true,
            })
            if (res.docs.length > 0) {
              const doc = res.docs[0]
              if (doc?.id) {
                await req.payload.delete({
                  collection: 'audience-poker-submissions',
                  id: doc.id,
                  overrideAccess: true,
                })
              }
            }
            return Response.json({ ok: true })
          }
          if (activityType === 'stakeholder-map') {
            const res = await req.payload.find({
              collection: 'stakeholder-map-submissions',
              where: { submittedBy: { equals: userId }, activity: { equals: entityId } },
              limit: 1,
              depth: 0,
              overrideAccess: true,
            })
            if (res.docs.length > 0) {
              const doc = res.docs[0]
              if (doc?.id) {
                await req.payload.delete({
                  collection: 'stakeholder-map-submissions',
                  id: doc.id,
                  overrideAccess: true,
                })
              }
            }
            return Response.json({ ok: true })
          }
          return Response.json({ error: 'Unknown activity type' }, { status: 400 })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          console.error('[reset-user-activity]', message)
          return Response.json({ error: message }, { status: 500 })
        }
      },
    },
    {
      path: '/platform-survey-questions/grouped',
      method: 'get',
      handler: async (req) => {
        const notConfigured = requireActivitySecretInProduction()
        if (notConfigured) return notConfigured
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
        const notConfigured = requireActivitySecretInProduction()
        if (notConfigured) return notConfigured
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
  collections: [
    Companies,
    Users,
    Media,
    Faqs,
    ImageChoiceAssessments,
    AudiencePokerActivities,
    ContentRank,
    PlatformSurveyQuestions,
    StakeholderMapActivities,
    ImageChoiceResponses,
    AudiencePokerSubmissions,
    PlatformSurveyResponses,
    StakeholderMapSubmissions,
    MigrationReviewSession,
  ],
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
