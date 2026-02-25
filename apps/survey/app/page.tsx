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
          if (config && typeof config.title === 'string' && config.title) {
            setTitle(config.title)
          }
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
      if (typeof v === 'object' && !Array.isArray(v) && 'pain' in v && (v as { pain: number }).pain === 0) return false
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
      const recommendation = computeRecommendation(answers)
      setStep('thankyou')
      setRecommendation(recommendation)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err))
    }
  }

  const [recommendation, setRecommendation] = useState<{ platform: string; rationale: string } | null>(null)

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
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm text-center max-w-md">
          <h2 className="text-xl font-semibold text-slate-900">Thank you</h2>
          <p className="mt-2 text-slate-600">Your responses have been recorded.</p>
          {recommendation && (
            <div className="mt-6 rounded border border-slate-200 bg-slate-50 p-4 text-left">
              <p className="text-sm font-medium text-slate-700">Platform recommendation</p>
              <p className="mt-1 font-medium text-slate-900">{recommendation.platform}</p>
              <p className="mt-1 text-sm text-slate-600">{recommendation.rationale}</p>
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
      const m = v as { pain?: number; frequency?: string; owner?: string; whatMakesHard?: string }
      return [m.pain && `Pain ${m.pain}`, m.frequency, m.owner, m.whatMakesHard].filter(Boolean).join(' · ') || '—'
    }
    return Object.entries(v).map(([k, val]) => `${k}: ${val}`).join('; ') || '—'
  }
  return '—'
}

/** Simple scoring map: answer patterns -> platform. Returns top recommendation and short rationale. */
function computeRecommendation(answers: SurveyAnswers): { platform: string; rationale: string } | null {
  const categories = ['headless-cms', 'wordpress', 'webflow', 'hubspot-cms', 'contentful'] as const
  const scores: Record<string, number> = { 'headless-cms': 0, wordpress: 0, webflow: 0, 'hubspot-cms': 0, contentful: 0 }

  // Example rules (can be moved to CMS later)
  const technicalComfort = answers['technical-comfort']
  if (typeof technicalComfort === 'number' && technicalComfort >= 4) {
    scores['headless-cms'] = (scores['headless-cms'] ?? 0) + 2
    scores['contentful'] = (scores['contentful'] ?? 0) + 1
  }
  const teamSize = answers['team-size']
  if (teamSize === 'solo' || teamSize === '2-5') {
    scores['wordpress'] = (scores['wordpress'] ?? 0) + 1
    scores['webflow'] = (scores['webflow'] ?? 0) + 2
  }
  if (teamSize === '16-plus') {
    scores['headless-cms'] = (scores['headless-cms'] ?? 0) + 1
    scores['contentful'] = (scores['contentful'] ?? 0) + 2
  }
  const personalization = answers['personalization-level']
  if (typeof personalization === 'number' && personalization >= 4) {
    scores['hubspot-cms'] = (scores['hubspot-cms'] ?? 0) + 2
  }
  const needsVisual = answers['needs-visual-editing']
  if (needsVisual === 'yes-essential') {
    scores['webflow'] = (scores['webflow'] ?? 0) + 2
    scores['hubspot-cms'] = (scores['hubspot-cms'] ?? 0) + 1
  }
  if (needsVisual === 'no') {
    scores['headless-cms'] = (scores['headless-cms'] ?? 0) + 1
    scores['contentful'] = (scores['contentful'] ?? 0) + 1
  }

  const sorted = (categories as unknown as string[])
    .map((c) => ({ platform: c, score: scores[c] ?? 0 }))
    .sort((a, b) => b.score - a.score)
  const top = sorted[0]
  if (!top || top.score === 0) {
    return { platform: 'Headless CMS', rationale: 'Based on your answers, a flexible headless CMS could be a good fit.' }
  }
  const labels: Record<string, string> = {
    'headless-cms': 'Headless CMS',
    wordpress: 'WordPress',
    webflow: 'Webflow',
    'hubspot-cms': 'HubSpot CMS',
    contentful: 'Contentful',
  }
  const rationales: Record<string, string> = {
    'headless-cms': 'Your technical comfort and scale needs point toward a headless setup.',
    wordpress: 'Your team size and content needs align well with WordPress.',
    webflow: 'Visual editing and simplicity are a strong match for Webflow.',
    'hubspot-cms': 'Marketing and personalization priorities suggest HubSpot CMS.',
    contentful: 'Your scale and structure needs align with Contentful.',
  }
  return {
    platform: labels[top.platform] ?? top.platform,
    rationale: rationales[top.platform] ?? 'Based on your answers, this platform is a good fit.',
  }
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
