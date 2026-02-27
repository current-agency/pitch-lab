import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { ActivityCard } from '@/components/activity-card'
import { ApplicationShell5 } from '@/components/application-shell5'
import { type CardData } from '@/components/feature222'
import { getCmsUrl } from '@repo/env'
import { requireAuth } from '@/lib/auth'
const DEFAULT_CARD_BACKGROUND =
  'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/photos/simone-hutsch-5oYbG-sEImY-unsplash.jpg'
const CONTENT_RANK_BACKGROUND =
  'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/photos/simone-hutsch-o9F8dRoSucM-unsplash.jpg'
const SURVEY_BACKGROUND =
  'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/photos/simone-hutsch-5oYbG-sEImY-unsplash.jpg'

/** Card data plus type and id for completion matching. Content rank has no completion. */
type DashboardCard = CardData & {
  cardType: 'image-choice' | 'audience-poker' | 'stakeholder-map' | 'survey' | 'content-rank'
  entityId: string
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

function toImageChoiceCard(assessment: string | AssignedAssessment): DashboardCard {
  const id = typeof assessment === 'string' ? assessment : assessment.id
  const title = typeof assessment === 'string' ? 'This or That' : (assessment.title || 'This or That')
  const link = `/dashboard/apps/image-choice?assessment=${encodeURIComponent(id)}`
  return {
    title,
    link,
    background: DEFAULT_CARD_BACKGROUND,
    stats: [{ number: 'Visual Design', text: 'Skip the mood board debate. A fast series of visual choices that reveals design instincts in minutes.' }],
    cardType: 'image-choice',
    entityId: id,
  }
}

function toContentRankCard(instance: ContentRankInstance): DashboardCard {
  const id = typeof instance === 'string' ? instance : instance.id
  const title = typeof instance === 'string' ? 'Content rank' : (instance.title || 'Content rank')
  const link = `/dashboard/apps/content-rank?instance=${encodeURIComponent(id)}`
  return {
    title,
    link,
    background: CONTENT_RANK_BACKGROUND,
    stats: [{ number: 'Rank', text: 'Rank pages from ScreamingFrog + GA4: move, lost, reuse' }],
    cardType: 'content-rank',
    entityId: id,
  }
}

function toSurveyCard(companyId: string): DashboardCard {
  return {
    title: 'Platform Fit',
    link: `/dashboard/apps/survey?company=${encodeURIComponent(companyId)}`,
    background: SURVEY_BACKGROUND,
    stats: [{ number: 'Technology', text: 'The right CMS for how you actually work not just what looks good on a feature comparison chart.' }],
    cardType: 'survey',
    entityId: companyId,
  }
}

function toStakeholderMapCard(activity: string | AssignedStakeholderMapActivity): DashboardCard {
  const activityId = typeof activity === 'string' ? activity : activity.id
  const title = typeof activity === 'string' ? 'Stakeholder Map' : (activity.title || 'Stakeholder Map')
  const link = `/dashboard/apps/stakeholder-map?activity=${encodeURIComponent(activityId)}`
  return {
    title,
    link,
    background: DEFAULT_CARD_BACKGROUND,
    stats: [{ number: 'Project Management', text: 'Who decides, who influences, who just needs to feel heard? Map the room before the room maps you.' }],
    cardType: 'stakeholder-map',
    entityId: activityId,
  }
}

function toAudiencePokerCard(activity: AssignedAudiencePokerActivity): DashboardCard {
  const id = typeof activity === 'string' ? activity : activity.id
  const title = typeof activity === 'string' ? 'Audience Poker' : (activity.title || 'Audience Poker')
  const link = `/dashboard/apps/audience-poker/activity/${id}`
  return {
    title,
    link,
    background: DEFAULT_CARD_BACKGROUND,
    stats: [{ number: 'Information Architecture', text: 'Everyone\'s audience is "equally important" until they have to put money on it. Place your bets.' }],
    cardType: 'audience-poker',
    entityId: id,
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const { token } = requireAuth(cookieStore)

  const base = getCmsUrl()
  const [userRes, contentRankRes, completionsRes] = await Promise.all([
    fetch(`${base}/api/users/me?depth=2`, {
      headers: { Authorization: `JWT ${token}` },
      next: { revalidate: 0 },
    }),
    fetch(
      `${base}/api/content-rank?where[isActive][equals]=true&limit=100&depth=0&select[id]=true&select[title]=true&select[accessToken]=true`,
      { headers: { Authorization: `JWT ${token}` }, next: { revalidate: 0 } },
    ),
    fetch(`${base}/api/dashboard-completions`, {
      headers: { Authorization: `JWT ${token}` },
      next: { revalidate: 0 },
    }),
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

  const completionsData = await completionsRes.json().catch(() => ({}))
  const completions = completionsRes.ok
    ? (completionsData as {
        imageChoiceAssessmentIds?: string[]
        audiencePokerActivityIds?: string[]
        stakeholderMapActivityIds?: string[]
        surveyCompleted?: boolean
      })
    : null
  const imageChoiceDone = new Set(completions?.imageChoiceAssessmentIds ?? [])
  const audiencePokerDone = new Set(completions?.audiencePokerActivityIds ?? [])
  const stakeholderMapDone = new Set(completions?.stakeholderMapActivityIds ?? [])
  const surveyDone = completions?.surveyCompleted ?? false

  const userCompany = user?.company
  const companyId = typeof userCompany === 'object' && userCompany?.id ? userCompany.id : typeof userCompany === 'string' ? userCompany : null

  const applicationCards: DashboardCard[] = assigned
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

  const allCards: DashboardCard[] = [
    ...applicationCards,
    ...contentRankCards,
    ...(surveyCard ? [surveyCard] : []),
  ]

  const cardsWithStatus = allCards.map((card) => {
    const completed =
      card.cardType === 'image-choice'
        ? imageChoiceDone.has(card.entityId)
        : card.cardType === 'audience-poker'
          ? audiencePokerDone.has(card.entityId)
          : card.cardType === 'stakeholder-map'
            ? stakeholderMapDone.has(card.entityId)
            : card.cardType === 'survey'
              ? surveyDone
              : false // content-rank has no completion
    return { ...card, completed }
  })

  const sortedCards = [...cardsWithStatus].sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1))

  return (
    <ApplicationShell5
      user={{ name: userName, email: userEmail, avatar: '' }}
    >
      <div className="rounded-xl p-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Hello, {user?.firstName ?? 'there'}
        </h1>
        <p className="mt-1 text-slate-600">Choose an application to open.</p>
        {sortedCards.length > 0 ? (
          <div className="mt-10 flex flex-col gap-10">
            <div className="flex flex-wrap gap-6">
              {sortedCards
                .filter((card) => !card.completed)
                .map((card) => (
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
            {sortedCards.some((card) => card.completed) ? (
              <>
                <hr className="border-slate-200" />
                <div className="flex flex-wrap gap-6">
                  {sortedCards
                    .filter((card) => card.completed)
                    .map((card) => (
                      <ActivityCard
                        key={card.link}
                        status="Completed"
                        title={card.title}
                        description={card.stats[0]?.text}
                        categoryTag={card.stats[0]?.number}
                        href={card.link}
                      />
                    ))}
                </div>
              </>
            ) : null}
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
