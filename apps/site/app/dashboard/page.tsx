import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { ActivityCard } from '@/components/activity-card'
import { ApplicationShell5 } from '@/components/application-shell5'
import { type CardData } from '@/components/feature222'
import { requireAuth } from '@/lib/auth'

const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'
const DEFAULT_CARD_BACKGROUND =
  'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/photos/simone-hutsch-5oYbG-sEImY-unsplash.jpg'
const CONTENT_RANK_BACKGROUND =
  'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/photos/simone-hutsch-o9F8dRoSucM-unsplash.jpg'
const SURVEY_BACKGROUND =
  'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/photos/simone-hutsch-5oYbG-sEImY-unsplash.jpg'


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

function toImageChoiceCard(assessment: string | AssignedAssessment): CardData {
  const id = typeof assessment === 'string' ? assessment : assessment.id
  const title = typeof assessment === 'string' ? 'Assessment' : (assessment.title || 'Image choice')
  const description =
    typeof assessment === 'string' ? '' : (assessment.description || 'Time-based selection between two images')
  const link = `/dashboard/apps/image-choice?assessment=${encodeURIComponent(id)}`
  return {
    title,
    link,
    background: DEFAULT_CARD_BACKGROUND,
    stats: [{ number: 'A/B', text: description || 'Time-based selection between two images' }],
  }
}

function toContentRankCard(instance: ContentRankInstance): CardData {
  const id = typeof instance === 'string' ? instance : instance.id
  const title = typeof instance === 'string' ? 'Content rank' : (instance.title || 'Content rank')
  const link = `/dashboard/apps/content-rank?instance=${encodeURIComponent(id)}`
  return {
    title,
    link,
    background: CONTENT_RANK_BACKGROUND,
    stats: [{ number: 'Rank', text: 'Rank pages from ScreamingFrog + GA4: move, lost, reuse' }],
  }
}

function toSurveyCard(companyId: string): CardData {
  return {
    title: 'Platform Fit Quiz',
    link: `/dashboard/apps/survey?company=${encodeURIComponent(companyId)}`,
    background: SURVEY_BACKGROUND,
    stats: [{ number: 'Survey', text: 'Platform Fit Quiz: answer questions to get a platform recommendation' }],
  }
}

function toStakeholderMapCard(activity: string | AssignedStakeholderMapActivity): CardData {
  const activityId = typeof activity === 'string' ? activity : activity.id
  const title = typeof activity === 'string' ? 'Stakeholder Map' : (activity.title || 'Stakeholder Map')
  const link = `/dashboard/apps/stakeholder-map?activity=${encodeURIComponent(activityId)}`
  return {
    title,
    link,
    background: DEFAULT_CARD_BACKGROUND,
    stats: [{ number: 'Map', text: 'Map stakeholders by influence and interest' }],
  }
}

function toAudiencePokerCard(activity: AssignedAudiencePokerActivity): CardData {
  const id = typeof activity === 'string' ? activity : activity.id
  const title = typeof activity === 'string' ? 'Audience Poker' : (activity.title || 'Audience Poker')
  const link = `/dashboard/apps/audience-poker/activity/${id}`
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
    company?: string | { id: string; name?: string | null } | null
    platformSurveyEnabled?: boolean | null
  }
  const assigned = user?.assignedApplications ?? []
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'User'
  const userEmail = user?.email ?? ''

  const contentRankData = await contentRankRes.json().catch(() => ({ docs: [] }))
  const contentRanks = (contentRankData.docs ?? []) as ContentRankInstance[]

  const userCompany = user?.company
  const companyId = typeof userCompany === 'object' && userCompany?.id ? userCompany.id : typeof userCompany === 'string' ? userCompany : null

  const applicationCards: CardData[] = assigned
    .filter((a): a is PolymorphicAssignment | string | AssignedAssessment | AssignedAudiencePokerActivity | AssignedStakeholderMapActivity => !!a)
    .flatMap((a) => {
      const polymorphic = a as PolymorphicAssignment
      if (typeof polymorphic === 'object' && 'relationTo' in polymorphic && polymorphic.value != null) {
        if (polymorphic.relationTo === 'image-choice-assessments') {
          return [toImageChoiceCard(polymorphic.value as AssignedAssessment)]
        }
        if (polymorphic.relationTo === 'audience-poker-activities') {
          return [toAudiencePokerCard(polymorphic.value as AssignedAudiencePokerActivity)]
        }
        if (polymorphic.relationTo === 'stakeholder-map-activities') {
          return [toStakeholderMapCard(polymorphic.value as AssignedStakeholderMapActivity)]
        }
      }
      // Legacy: plain ID or populated image-choice doc (no relationTo)
      const legacy = a as string | AssignedAssessment
      return [toImageChoiceCard(legacy)]
    })
  const contentRankCards = contentRanks.map((c) => toContentRankCard(c))

  const surveyCard = user?.platformSurveyEnabled && companyId ? toSurveyCard(companyId) : null

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
