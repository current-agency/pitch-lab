'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@repo/ui'
import type { GroupedQuestionsResponse, SurveySection, SurveyAnswers, SurveyAnswerValue } from './types'
import { QuestionRenderer } from './components/QuestionRenderer'

type Step = 'survey' | 'summary' | 'thankyou'

const DEFAULT_TITLE = 'Platform Fit Quiz'

function SurveyPageContent() {
  const searchParams = useSearchParams()
  const companyId = useMemo(() => searchParams.get('company')?.trim() ?? null, [searchParams])

  const [title, setTitle] = useState<string>(DEFAULT_TITLE)
  const [sections, setSections] = useState<SurveySection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<SurveyAnswers>({})
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [step, setStep] = useState<Step>('survey')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    // Always load questions from the grouped endpoint (same one as /platform-survey-questions/grouped).
    // When we have a company, we also fetch config only for the title; sections come from questions.
    const loadQuestions = () =>
      fetch('/api/platform-survey-questions')
        .then((res) => {
          if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.error || res.statusText)))
          return res.json() as Promise<GroupedQuestionsResponse>
        })
        .then((data) => {
          if (!cancelled) setSections(data.sections ?? [])
        })

    const loadWithCompany = () => {
      const configUrl = '/api/platform-survey-config?company=' + encodeURIComponent(companyId!)
      Promise.all([
        fetch(configUrl).then((res) => (res.ok ? res.json() : Promise.resolve(null))),
        loadQuestions(),
      ])
        .then(([config]) => {
          if (cancelled) return
          // Config validates company has survey enabled; title stays "Platform Fit Quiz" (no company name)
          setStartTime(Date.now())
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : String(err))
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    const loadWithoutInstance = () => {
      loadQuestions()
        .then(() => {
          if (!cancelled) setStartTime(Date.now())
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : String(err))
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    if (companyId) {
      loadWithCompany()
    } else {
      loadWithoutInstance()
    }

    return () => {
      cancelled = true
    }
  }, [companyId])

  const setAnswer = useCallback((key: string, value: SurveyAnswerValue) => {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }, [])

  const currentSection = sections[currentStepIndex]
  const isLastSection = currentStepIndex >= sections.length - 1 && sections.length > 0
  const totalSections = sections.length

  const getRequiredKeysForSection = (sec: SurveySection): string[] => {
    return (sec.questions ?? []).filter((q) => q.required !== false).map((q) => q.questionKey)
  }

  const validateCurrentSection = (): boolean => {
    if (!currentSection) return true
    const required = getRequiredKeysForSection(currentSection)
    for (const key of required) {
      const v = answers[key]
      if (v == null || v === '') return false
      if (Array.isArray(v) && v.length === 0) return false
      if (typeof v === 'object' && !Array.isArray(v) && 'pain' in v) {
        if ((v as { notApplicable?: boolean }).notApplicable) return true
        if ((v as { pain?: number }).pain === 0) return false
      }
    }
    return true
  }

  const handleNext = () => {
    if (!validateCurrentSection()) {
      setSubmitError('Please answer all required questions before continuing.')
      return
    }
    setSubmitError(null)
    if (isLastSection) {
      setStep('summary')
    } else {
      setCurrentStepIndex((i) => i + 1)
    }
  }

  const handleBack = () => {
    if (step === 'summary') {
      setStep('survey')
      return
    }
    setCurrentStepIndex((i) => Math.max(0, i - 1))
    setSubmitError(null)
  }

  const handleSubmit = async () => {
    setSubmitError(null)
    const completionTime = startTime != null ? Math.round((Date.now() - startTime) / 1000) : undefined
    const payloadAnswers = { ...answers }
    for (const sec of sections) {
      for (const q of sec.questions ?? []) {
        if (q.inputType === 'ranking' && (payloadAnswers[q.questionKey] == null || (Array.isArray(payloadAnswers[q.questionKey]) && (payloadAnswers[q.questionKey] as string[]).length === 0))) {
          payloadAnswers[q.questionKey] = (q.options ?? []).map((o) => o.value)
        }
      }
    }
    try {
      const res = await fetch('/api/platform-survey-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: payloadAnswers,
          completionTime,
          ...(companyId ? { company: companyId } : {}),
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || d.details || res.statusText)
      }
      const recommendationList = computeRecommendation(answers)
      setStep('thankyou')
      setRecommendations(recommendationList)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err))
    }
  }

  const [recommendations, setRecommendations] = useState<{ platform: string; rationale: string }[]>([])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <p className="text-slate-600">Loading survey...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <p className="font-medium">Could not load survey</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (sections.length === 0) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <p className="text-slate-600">No questions available. Add questions in the CMS.</p>
      </div>
    )
  }

  if (step === 'thankyou') {
    return (
      <div className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm text-center max-w-lg w-full">
          <h2 className="text-xl font-semibold text-slate-900">Thank you</h2>
          <p className="mt-2 text-slate-600">Your responses have been recorded.</p>
          {recommendations.length > 0 && (
            <div className="mt-6 rounded border border-slate-200 bg-slate-50 p-4 text-left">
              <p className="text-sm font-medium text-slate-700">Top 3 platform recommendations</p>
              <ol className="mt-3 space-y-3 list-decimal list-inside">
                {recommendations.map((rec, i) => (
                  <li key={i} className="pl-1">
                    <span className="font-medium text-slate-900">{rec.platform}</span>
                    <p className="mt-0.5 text-sm text-slate-600">{rec.rationale}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (step === 'summary') {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-4 text-2xl font-bold text-slate-900">Review your answers</h1>
          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            {sections.map((sec) => (
              <div key={sec.section}>
                <h2 className="text-sm font-semibold text-slate-500">{sec.sectionLabel}</h2>
                <ul className="mt-2 space-y-1 text-slate-800">
                  {(sec.questions ?? []).map((q) => (
                    <li key={q.questionKey}>
                      <span className="font-medium">{q.questionText}</span>
                      {' — '}
                      <span className="text-slate-600">{formatAnswer(answers[q.questionKey])}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {submitError && (
              <p className="text-sm text-red-600">{submitError}</p>
            )}
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button type="button" onClick={handleSubmit}>
                Submit
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-slate-700 transition-all duration-300"
              style={{ width: `${totalSections ? ((currentStepIndex + 1) / totalSections) * 100 : 0}%` }}
            />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Section {currentStepIndex + 1} of {totalSections}
          </p>
        </div>

        {currentSection && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">{currentSection.sectionLabel}</h2>
            <div className="space-y-6">
              {(currentSection.questions ?? []).map((q) => (
                <div key={q.questionKey}>
                  <label className="block font-medium text-slate-800">
                    {q.questionText}
                    {q.required !== false && <span className="text-red-500"> *</span>}
                  </label>
                  {q.helpText && <p className="mb-2 text-sm text-slate-600">{q.helpText}</p>}
                  <div className="mt-2">
                    <QuestionRenderer
                      question={q}
                      value={answers[q.questionKey]}
                      onChange={setAnswer}
                    />
                  </div>
                </div>
              ))}
            </div>
            {submitError && <p className="mt-4 text-sm text-red-600">{submitError}</p>}
            <div className="mt-6 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStepIndex === 0}
              >
                Back
              </Button>
              <Button type="button" onClick={handleNext}>
                {isLastSection ? 'Review answers' : 'Next'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatAnswer(v: SurveyAnswerValue | undefined): string {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v)) {
    const opts = v.filter((x) => typeof x === 'string' && !x.startsWith('__'))
    return opts.join(', ') || '—'
  }
  if (typeof v === 'object' && v !== null) {
    if ('pain' in v) {
      const m = v as { pain?: number; frequency?: string; owner?: string; whatMakesHard?: string; notApplicable?: boolean }
      if (m.notApplicable) return "I don't do this / I've never done this"
      return [m.pain && `Pain ${m.pain}`, m.frequency, m.owner, m.whatMakesHard].filter(Boolean).join(' · ') || '—'
    }
    return Object.entries(v).map(([k, val]) => `${k}: ${val}`).join('; ') || '—'
  }
  return '—'
}

/** Scoring uses actual survey question keys and option values. Returns top 3 platform recommendations. */
function computeRecommendation(answers: SurveyAnswers): { platform: string; rationale: string }[] {
  const categories = ['headless-cms', 'wordpress', 'webflow', 'hubspot-cms', 'contentful'] as const
  const scores: Record<string, number> = { 'headless-cms': 0, wordpress: 0, webflow: 0, 'hubspot-cms': 0, contentful: 0 }

  // Editor autonomy: technical-comfort-level
  const technicalComfort = answers['technical-comfort-level']
  if (technicalComfort === 'very-technical') {
    scores['headless-cms'] += 2
    scores['contentful'] += 1
  }
  if (technicalComfort === 'marketing-content' || technicalComfort === 'moderately-technical') {
    scores['webflow'] += 1
    scores['hubspot-cms'] += 1
    scores['wordpress'] += 1
  }

  // Content complexity: content-relationships
  const contentRelations = answers['content-relationships']
  if (contentRelations === 'highly-connected' || contentRelations === 'complex-relationships') {
    scores['headless-cms'] += 2
    scores['contentful'] += 2
  }
  if (contentRelations === 'standalone' || contentRelations === 'some-connections') {
    scores['wordpress'] += 1
    scores['webflow'] += 1
  }

  // Multilingual / multisite: multilingual-multisite (array)
  const multi = answers['multilingual-multisite']
  const multiArr = Array.isArray(multi) ? multi : []
  if (multiArr.some((v) => v === 'multiple-languages' || v === 'multiple-brands-sites')) {
    scores['contentful'] += 2
    scores['headless-cms'] += 1
  }

  // Design freedom: design-freedom-vs-guardrails
  const designFreedom = answers['design-freedom-vs-guardrails']
  if (designFreedom === 'complete-freedom') {
    scores['webflow'] += 2
  }
  if (designFreedom === 'strict-templates') {
    scores['hubspot-cms'] += 1
    scores['wordpress'] += 1
  }

  // Marketing / personalization (rating 1–5)
  const marketingDynamic = answers['marketing-dynamic-content']
  const marketingPersonalized = answers['marketing-personalized-experiences']
  if (typeof marketingDynamic === 'number' && marketingDynamic >= 4) scores['hubspot-cms'] += 1
  if (typeof marketingPersonalized === 'number' && marketingPersonalized >= 4) {
    scores['hubspot-cms'] += 2
  }

  // Lead gen priority
  const leadGen = answers['lead-generation-priority']
  if (leadGen === 'lead-gen') {
    scores['hubspot-cms'] += 2
  }
  if (leadGen === 'brand-info') {
    scores['wordpress'] += 1
    scores['webflow'] += 1
  }

  // Integrations: integration-priority
  const integrationPriority = answers['integration-priority']
  if (integrationPriority === 'native-maintained') {
    scores['hubspot-cms'] += 1
    scores['wordpress'] += 1
  }
  if (integrationPriority === 'api-access' || integrationPriority === 'build-middleware') {
    scores['headless-cms'] += 1
    scores['contentful'] += 1
  }

  // Team resources: development-resources
  const devResources = answers['development-resources']
  if (devResources === 'no-developer') {
    scores['webflow'] += 2
    scores['hubspot-cms'] += 1
    scores['wordpress'] += 2
  }
  if (devResources === 'fulltime-internal') {
    scores['headless-cms'] += 1
    scores['contentful'] += 1
  }

  // Scale: content-volume, traffic-performance
  const contentVolume = answers['content-volume']
  if (contentVolume === '10000-plus' || contentVolume === '2000-10000') {
    scores['contentful'] += 2
    scores['headless-cms'] += 1
  }
  if (contentVolume === 'under-100' || contentVolume === '100-500') {
    scores['wordpress'] += 1
    scores['webflow'] += 1
  }

  // Budget: platform-budget-annual
  const budget = answers['platform-budget-annual']
  if (budget === 'under-2k' || budget === '2k-10k') {
    scores['wordpress'] += 2
    scores['webflow'] += 1
  }
  if (budget === '50k-plus') {
    scores['hubspot-cms'] += 1
    scores['contentful'] += 1
  }

  // Ideal workflow ranking: high importance for "see-as-you-build" or "drag-drop" → Webflow/HubSpot
  const ranking = answers['ideal-workflow-ranking']
  const rankArr = Array.isArray(ranking) ? (ranking as string[]) : []
  const first = rankArr[0]
  if (first === 'see-as-you-build' || first === 'drag-drop-sections') {
    scores['webflow'] += 2
    scores['hubspot-cms'] += 1
  }
  if (first === 'custom-code') {
    scores['headless-cms'] += 2
  }
  if (rankArr.indexOf('template-library') <= 1) {
    scores['hubspot-cms'] += 1
    scores['wordpress'] += 1
  }

  const labels: Record<string, string> = {
    'headless-cms': 'Headless CMS',
    wordpress: 'WordPress',
    webflow: 'Webflow',
    'hubspot-cms': 'HubSpot CMS',
    contentful: 'Contentful',
  }
  const rationales: Record<string, string> = {
    'headless-cms': 'Your technical comfort and content structure point toward a flexible headless setup.',
    wordpress: 'Your team and content needs align well with WordPress’s ecosystem and cost profile.',
    webflow: 'Visual editing and design freedom are a strong match for Webflow.',
    'hubspot-cms': 'Marketing and lead-generation priorities suggest HubSpot CMS.',
    contentful: 'Scale, structure, and integration needs align with Contentful.',
  }

  const sorted = (categories as unknown as string[])
    .map((c) => ({ platform: c, score: scores[c] ?? 0 }))
    .sort((a, b) => b.score - a.score)

  const topThree = sorted.slice(0, 3).map(({ platform }) => ({
    platform: labels[platform] ?? platform,
    rationale: rationales[platform] ?? 'Based on your answers, this platform could be a good fit.',
  }))

  if (topThree.length === 0 || sorted[0]?.score === 0) {
    return [
      { platform: 'Headless CMS', rationale: 'Based on your answers, a flexible headless CMS could be a good fit. Answer more questions for a more specific recommendation.' },
      { platform: 'WordPress', rationale: 'Your team and content needs may align with WordPress’s ecosystem and cost profile.' },
      { platform: 'Webflow', rationale: 'Visual editing and design freedom are a strong match for Webflow.' },
    ]
  }

  return topThree
}

export default function SurveyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
          <p className="text-slate-600">Loading...</p>
        </div>
      }
    >
      <SurveyPageContent />
    </Suspense>
  )
}
