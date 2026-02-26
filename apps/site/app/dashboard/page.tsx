import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { ActivityCard } from '@/components/activity-card'
import { ApplicationShell5 } from '@/components/application-shell5'
import { type CardData } from '@/components/feature222'
import { requireAuth } from '@/lib/auth'
import { createAudiencePokerToken } from '@/lib/audience-poker-token'
import { createImageChoiceToken } from '@/lib/image-choice-token'

const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'
const IMAGE_CHOICE_URL =
  process.env.NEXT_PUBLIC_IMAGE_CHOICE_URL || 'http://localhost:3002'
const CONTENT_RANK_URL =
  process.env.NEXT_PUBLIC_CONTENT_RANK_URL || 'http://localhost:3003'
const SURVEY_URL =
  process.env.NEXT_PUBLIC_SURVEY_URL || 'http://localhost:3005'
const AUDIENCE_POKER_URL =
  process.env.NEXT_PUBLIC_AUDIENCE_POKER_URL || 'http://localhost:3007'
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

/** Polymorphic assignedApplications: array of { relationTo, value } from Payload */
type PolymorphicAssignment =
  | { relationTo: 'image-choice-assessments'; value: string | AssignedAssessment }
  | { relationTo: 'audience-poker-activities'; value: string | AssignedAudiencePokerActivity }

type ContentRankInstance = {
  id: string
  title?: string | null
  accessToken?: string | null
}

function toImageChoiceCard(assessment: string | AssignedAssessment, userId?: string | null): CardData {
  const id = typeof assessment === 'string' ? assessment : assessment.id
  const title = typeof assessment === 'string' ? 'Assessment' : (assessment.title || 'Image choice')
  const description =
    typeof assessment === 'string' ? '' : (assessment.description || 'Time-based selection between two images')
  const token = userId ? createImageChoiceToken(userId) : null
  const link = token
    ? `${IMAGE_CHOICE_URL}?assessment=${id}&token=${encodeURIComponent(token)}`
    : `${IMAGE_CHOICE_URL}?assessment=${id}`
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
  const token = typeof instance === 'object' && instance.accessToken ? instance.accessToken : ''
  const link = token ? `${CONTENT_RANK_URL}?id=${id}&token=${encodeURIComponent(token)}` : `${CONTENT_RANK_URL}?id=${id}`
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
    link: `${SURVEY_URL}?company=${encodeURIComponent(companyId)}`,
    background: SURVEY_BACKGROUND,
    stats: [{ number: 'Survey', text: 'Platform Fit Quiz: answer questions to get a platform recommendation' }],
  }
}

function toAudiencePokerCard(
  activity: AssignedAudiencePokerActivity,
  userId?: string | null,
): CardData {
  const id = typeof activity === 'string' ? activity : activity.id
  const title = typeof activity === 'string' ? 'Audience Poker' : (activity.title || 'Audience Poker')
  const token = userId ? createAudiencePokerToken(userId) : null
  const link = token
    ? `${AUDIENCE_POKER_URL}/activity/${id}?token=${encodeURIComponent(token)}`
    : `${AUDIENCE_POKER_URL}/activity/${id}`
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
    fetch(`${CMS_URL}/api/users/me?depth=1`, {
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

  const applicationCards: CardData[] = assigned
    .filter((a): a is PolymorphicAssignment | string | AssignedAssessment | AssignedAudiencePokerActivity => !!a)
    .flatMap((a) => {
      const polymorphic = a as PolymorphicAssignment
      if (typeof polymorphic === 'object' && 'relationTo' in polymorphic && polymorphic.value != null) {
        if (polymorphic.relationTo === 'image-choice-assessments') {
          return [toImageChoiceCard(polymorphic.value as AssignedAssessment, user?.id)]
        }
        if (polymorphic.relationTo === 'audience-poker-activities') {
          return [toAudiencePokerCard(polymorphic.value as AssignedAudiencePokerActivity, user?.id)]
        }
      }
      // Legacy: plain ID or populated image-choice doc (no relationTo)
      const legacy = a as string | AssignedAssessment
      return [toImageChoiceCard(legacy, user?.id)]
    })
  const contentRankCards = contentRanks.map(toContentRankCard)

  const userCompany = user?.company
  const companyId = typeof userCompany === 'object' && userCompany?.id ? userCompany.id : typeof userCompany === 'string' ? userCompany : null
  const surveyEnabled = typeof userCompany === 'object' && userCompany?.platformSurveyEnabled === true
  const surveyCard = companyId && surveyEnabled ? toSurveyCard(companyId) : null

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
                key={card.title + card.link}
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

        <hr className="my-12 border-slate-200" />

        <div className="flex flex-wrap gap-6">
          <ActivityCard
            status="Completed"
            title="Lorem ipsum dolor sit amet"
            description="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
            categoryTag="A/B"
            href="#"
          />
          <ActivityCard
            status="Completed"
            title="Consectetur adipiscing elit"
            description="Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
            categoryTag="RANK"
            href="#"
          />
          <ActivityCard
            status="Completed"
            title="Sed do eiusmod tempor"
            description="Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur."
            categoryTag="SURVEY"
            href="#"
          />
        </div>
      </div>
    </ApplicationShell5>
  )
}
