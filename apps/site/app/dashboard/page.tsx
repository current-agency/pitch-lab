import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { ActivityCard } from '@/components/activity-card'
import { ApplicationShell5 } from '@/components/application-shell5'
import { type CardData } from '@/components/feature222'

const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'
const IMAGE_CHOICE_URL =
  process.env.NEXT_PUBLIC_IMAGE_CHOICE_URL || 'http://localhost:3002'
const CONTENT_RANK_URL =
  process.env.NEXT_PUBLIC_CONTENT_RANK_URL || 'http://localhost:3003'
const SURVEY_URL =
  process.env.NEXT_PUBLIC_SURVEY_URL || 'http://localhost:3005'
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

type ContentRankInstance = {
  id: string
  title?: string | null
  accessToken?: string | null
}

function toImageChoiceCard(assessment: AssignedAssessment): CardData {
  const id = typeof assessment === 'string' ? assessment : assessment.id
  const title = typeof assessment === 'string' ? 'Assessment' : (assessment.title || 'Image choice')
  const description =
    typeof assessment === 'string' ? '' : (assessment.description || 'Time-based selection between two images')
  return {
    title,
    link: `${IMAGE_CHOICE_URL}?assessment=${id}`,
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

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  if (!token) {
    redirect('/login')
  }

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
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    assignedApplications?: (string | AssignedAssessment)[] | null
    company?: string | { id: string; name?: string | null; platformSurveyEnabled?: boolean } | null
  }
  const assigned = user?.assignedApplications ?? []
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'User'
  const userEmail = user?.email ?? ''

  const contentRankData = await contentRankRes.json().catch(() => ({ docs: [] }))
  const contentRanks = (contentRankData.docs ?? []) as ContentRankInstance[]

  const imageChoiceCards = assigned
    .filter((a): a is AssignedAssessment => !!a)
    .map(toImageChoiceCard)
  const contentRankCards = contentRanks.map(toContentRankCard)

  const userCompany = user?.company
  const companyId = typeof userCompany === 'object' && userCompany?.id ? userCompany.id : typeof userCompany === 'string' ? userCompany : null
  const surveyEnabled = typeof userCompany === 'object' && userCompany?.platformSurveyEnabled === true
  const surveyCard =
    companyId && surveyEnabled
      ? { ...toSurveyCard(companyId), openInOverlay: true as const }
      : null

  const cards: (CardData & { openInOverlay?: boolean })[] = [
    ...imageChoiceCards.map((c) => ({ ...c, openInOverlay: true })),
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
                openInOverlay={card.openInOverlay}
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
