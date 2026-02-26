import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { ActivityCard } from '@/components/activity-card'
import { ApplicationShell5 } from '@/components/application-shell5'
import { type CardData } from '@/components/feature222'
import { requireAuth } from '@/lib/auth'
import { createAudiencePokerToken } from '@/lib/audience-poker-token'
import { createImageChoiceToken } from '@/lib/image-choice-token'
import { createStakeholderMapToken } from '@/lib/stakeholder-map-token'

const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'
const DEFAULT_CARD_BACKGROUND =
  'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/photos/simone-hutsch-5oYbG-sEImY-unsplash.jpg'
const CONTENT_RANK_BACKGROUND =
  'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/photos/simone-hutsch-o9F8dRoSucM-unsplash.jpg'
const SURVEY_BACKGROUND =
  'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/photos/simone-hutsch-5oYbG-sEImY-unsplash.jpg'

/** Read at runtime so Vercel production env vars are used (not build-time inlined). */
function getAppUrls() {
  return {
    imageChoice: process.env.NEXT_PUBLIC_IMAGE_CHOICE_URL || 'http://localhost:3002',
    contentRank: process.env.NEXT_PUBLIC_CONTENT_RANK_URL || 'http://localhost:3003',
    survey: process.env.NEXT_PUBLIC_SURVEY_URL || 'http://localhost:3005',
    audiencePoker: process.env.NEXT_PUBLIC_AUDIENCE_POKER_URL || 'http://localhost:3007',
    stakeholderMap: process.env.NEXT_PUBLIC_STAKEHOLDER_MAP_URL || 'http://localhost:3008',
  }
}

type AssignedAssessment = {
  id: string
  title?: string | null
  description?: string | null
}

type AssignedAudiencePokerActivity = {
  id: string
  title?: string | null
}

type AssignedStakeholderMapActivity = {
  id: string
  title?: string | null
  company?: string | { id: string } | null
}

/** Polymorphic assignedApplications: array of { relationTo, value } from Payload */
type PolymorphicAssignment =
  | { relationTo: 'image-choice-assessments'; value: string | AssignedAssessment }
  | { relationTo: 'audience-poker-activities'; value: string | AssignedAudiencePokerActivity }
  | { relationTo: 'stakeholder-map-activities'; value: string | AssignedStakeholderMapActivity }

type ContentRankInstance = {
  id: string
  title?: string | null
  accessToken?: string | null
}

function toImageChoiceCard(
  assessment: string | AssignedAssessment,
  userId: string | null | undefined,
  baseUrl: string,
): CardData {
  const id = typeof assessment === 'string' ? assessment : assessment.id
  const title = typeof assessment === 'string' ? 'Assessment' : (assessment.title || 'Image choice')
  const description =
    typeof assessment === 'string' ? '' : (assessment.description || 'Time-based selection between two images')
  const token = userId ? createImageChoiceToken(userId) : null
  const link = token
    ? `${baseUrl}?assessment=${id}&token=${encodeURIComponent(token)}`
    : `${baseUrl}?assessment=${id}`
  return {
    title,
    link,
    background: DEFAULT_CARD_BACKGROUND,
    stats: [{ number: 'A/B', text: description || 'Time-based selection between two images' }],
  }
}

function toContentRankCard(instance: ContentRankInstance, baseUrl: string): CardData {
  const id = typeof instance === 'string' ? instance : instance.id
  const title = typeof instance === 'string' ? 'Content rank' : (instance.title || 'Content rank')
  const token = typeof instance === 'object' && instance.accessToken ? instance.accessToken : ''
  const link = token ? `${baseUrl}?id=${id}&token=${encodeURIComponent(token)}` : `${baseUrl}?id=${id}`
  return {
    title,
    link,
    background: CONTENT_RANK_BACKGROUND,
    stats: [{ number: 'Rank', text: 'Rank pages from ScreamingFrog + GA4: move, lost, reuse' }],
  }
}

function toSurveyCard(companyId: string, baseUrl: string): CardData {
  return {
    title: 'Platform Fit Quiz',
    link: `${baseUrl}?company=${encodeURIComponent(companyId)}`,
    background: SURVEY_BACKGROUND,
    stats: [{ number: 'Survey', text: 'Platform Fit Quiz: answer questions to get a platform recommendation' }],
  }
}

function toStakeholderMapCard(
  activity: string | AssignedStakeholderMapActivity,
  userId: string | null | undefined,
  baseUrl: string,
): CardData {
  const id = typeof activity === 'string' ? activity : activity.id
  const title = typeof activity === 'string' ? 'Stakeholder Map' : (activity.title || 'Stakeholder Map')
  const companyId =
    typeof activity === 'object' && activity.company
      ? typeof activity.company === 'string'
        ? activity.company
        : activity.company.id
      : null
  if (!companyId) {
    return {
      title,
      link: baseUrl,
      background: DEFAULT_CARD_BACKGROUND,
      stats: [{ number: 'Map', text: 'Map stakeholders by influence and interest' }],
    }
  }
  const token = userId ? createStakeholderMapToken(userId) : null
  const link = token
    ? `${baseUrl}?company=${encodeURIComponent(companyId)}&token=${encodeURIComponent(token)}`
    : `${baseUrl}?company=${encodeURIComponent(companyId)}`
  return {
    title,
    link,
    background: DEFAULT_CARD_BACKGROUND,
    stats: [{ number: 'Map', text: 'Map stakeholders by influence and interest' }],
  }
}

function toAudiencePokerCard(
  activity: AssignedAudiencePokerActivity,
  userId: string | null | undefined,
  baseUrl: string,
): CardData {
  const id = typeof activity === 'string' ? activity : activity.id
  const title = typeof activity === 'string' ? 'Audience Poker' : (activity.title || 'Audience Poker')
  const token = userId ? createAudiencePokerToken(userId) : null
  const link = token
    ? `${baseUrl}/activity/${id}?token=${encodeURIComponent(token)}`
    : `${baseUrl}/activity/${id}`
  return {
    title,
    link,
    background: DEFAULT_CARD_BACKGROUND,
    stats: [{ number: 'Poker', text: 'Allocate chips across audiences (unique values, no ties)' }],
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const { token } = requireAuth(cookieStore)

  const [userRes, contentRankRes] = await Promise.all([
    fetch(`${CMS_URL}/api/users/me?depth=2`, {
      headers: { Authorization: `JWT ${token}` },
      next: { revalidate: 0 },
    }),
    fetch(
      `${CMS_URL}/api/content-rank?where[isActive][equals]=true&limit=100&depth=0&select[id]=true&select[title]=true&select[accessToken]=true`,
      { headers: { Authorization: `JWT ${token}` }, next: { revalidate: 0 } },
    ),
  ])

  const data = await userRes.json().catch(() => ({}))
  if (!userRes.ok) {
    redirect('/login')
  }

  const user = data.user as {
    id?: string | null
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    assignedApplications?: PolymorphicAssignment[] | (string | AssignedAssessment)[] | null
    company?: string | { id: string; name?: string | null; platformSurveyEnabled?: boolean } | null
  }
  const assigned = user?.assignedApplications ?? []
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'User'
  const userEmail = user?.email ?? ''

  const contentRankData = await contentRankRes.json().catch(() => ({ docs: [] }))
  const contentRanks = (contentRankData.docs ?? []) as ContentRankInstance[]

  const urls = getAppUrls()

  const applicationCards: CardData[] = assigned
    .filter((a): a is PolymorphicAssignment | string | AssignedAssessment | AssignedAudiencePokerActivity | AssignedStakeholderMapActivity => !!a)
    .flatMap((a) => {
      const polymorphic = a as PolymorphicAssignment
      if (typeof polymorphic === 'object' && 'relationTo' in polymorphic && polymorphic.value != null) {
        if (polymorphic.relationTo === 'image-choice-assessments') {
          return [toImageChoiceCard(polymorphic.value as AssignedAssessment, user?.id, urls.imageChoice)]
        }
        if (polymorphic.relationTo === 'audience-poker-activities') {
          return [toAudiencePokerCard(polymorphic.value as AssignedAudiencePokerActivity, user?.id, urls.audiencePoker)]
        }
        if (polymorphic.relationTo === 'stakeholder-map-activities') {
          const act = polymorphic.value as AssignedStakeholderMapActivity
          const companyId =
            typeof act === 'object' && act?.company
              ? typeof act.company === 'string'
                ? act.company
                : act.company?.id
              : null
          if (!companyId) return []
          return [toStakeholderMapCard(act, user?.id, urls.stakeholderMap)]
        }
      }
      // Legacy: plain ID or populated image-choice doc (no relationTo)
      const legacy = a as string | AssignedAssessment
      return [toImageChoiceCard(legacy, user?.id, urls.imageChoice)]
    })
  const contentRankCards = contentRanks.map((c) => toContentRankCard(c, urls.contentRank))

  const userCompany = user?.company
  const companyId = typeof userCompany === 'object' && userCompany?.id ? userCompany.id : typeof userCompany === 'string' ? userCompany : null
  const surveyEnabled = typeof userCompany === 'object' && userCompany?.platformSurveyEnabled === true
  const surveyCard = companyId && surveyEnabled ? toSurveyCard(companyId, urls.survey) : null

  const cards: CardData[] = [
    ...applicationCards,
    ...contentRankCards,
    ...(surveyCard ? [surveyCard] : []),
  ]

  return (
    <ApplicationShell5
      user={{ name: userName, email: userEmail, avatar: '' }}
    >
      <div className="rounded-xl p-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Hello, {user?.firstName ?? 'there'}
        </h1>
        <p className="mt-1 text-slate-600">Choose an application to open.</p>
        {cards.length > 0 ? (
          <div className="mt-10 flex flex-wrap gap-6">
            {cards.map((card) => (
              <ActivityCard
                key={card.link}
                status="To do"
                title={card.title}
                description={card.stats[0]?.text}
                categoryTag={card.stats[0]?.number}
                href={card.link}
              />
            ))}
          </div>
        ) : (
          <p className="mt-8 rounded-lg border border-slate-200 bg-white px-4 py-6 text-slate-600">
            No applications assigned to you yet. Contact your administrator to get access.
          </p>
        )}
      </div>
    </ApplicationShell5>
  )
}
