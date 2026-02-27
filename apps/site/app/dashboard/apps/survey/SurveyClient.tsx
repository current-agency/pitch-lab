'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@repo/ui'
import type { GroupedQuestionsResponse, SurveySection, SurveyAnswers, SurveyAnswerValue } from '@/components/apps/survey/types'
import { QuestionRenderer } from '@/components/apps/survey/QuestionRenderer'
import { formatAnswer, computeRecommendation } from '@/components/apps/survey/survey-recommendation'

type Step = 'survey' | 'summary' | 'thankyou'

const DEFAULT_TITLE = 'Platform Fit Quiz'

const fetchOpts = { credentials: 'include' as const }

function SurveyClientContent() {
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
  const [recommendations, setRecommendations] = useState<{ platform: string; rationale: string }[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const loadQuestions = () =>
      fetch('/api/apps/survey/questions', fetchOpts)
        .then((res) => {
          if (!res.ok) return res.json().then((d) => Promise.reject(new Error((d as { error?: string }).error || res.statusText)))
          return res.json() as Promise<GroupedQuestionsResponse>
        })
        .then((data) => {
          if (!cancelled) setSections(data.sections ?? [])
        })

    if (companyId) {
      const configUrl = `/api/apps/survey/config?company=${encodeURIComponent(companyId)}`
      const submissionUrl = `/api/apps/survey/submission?company=${encodeURIComponent(companyId)}`
      Promise.all([
        fetch(configUrl, fetchOpts).then((res) => (res.ok ? res.json() : Promise.resolve(null))),
        fetch(submissionUrl, fetchOpts).then((res) => (res.ok ? res.json() : Promise.resolve(null))),
        loadQuestions(),
      ])
        .then(([config, existingResponse]) => {
          if (cancelled) return
          if (config && typeof (config as { title?: string }).title === 'string') {
            setTitle((config as { title: string }).title)
          }
          const resp = existingResponse as { answers?: SurveyAnswers } | null
          if (resp?.answers && typeof resp.answers === 'object' && Object.keys(resp.answers).length > 0) {
            setAnswers(resp.answers)
            setRecommendations(computeRecommendation(resp.answers))
            setStep('thankyou')
          } else {
            setStartTime(Date.now())
          }
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : String(err))
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    } else {
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
      const res = await fetch('/api/apps/survey/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          answers: payloadAnswers,
          completionTime,
          ...(companyId ? { company: companyId } : {}),
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string; details?: string }).error || (d as { details?: string }).details || res.statusText)
      }
      setRecommendations(computeRecommendation(answers))
      setStep('thankyou')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err))
    }
  }

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
          <Link href="/dashboard" className="mt-4 inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (sections.length === 0) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <p className="text-slate-600">No questions available. Add questions in the CMS.</p>
        <Link href="/dashboard" className="ml-4 inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
          ← Back to dashboard
        </Link>
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
          <Link href="/dashboard" className="mt-6 inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (step === 'summary') {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-2xl">
          <Link href="/dashboard" className="mb-4 inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            ← Back to dashboard
          </Link>
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
        <Link href="/dashboard" className="mb-4 inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
          ← Back to dashboard
        </Link>
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

export default function SurveyClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
          <p className="text-slate-600">Loading...</p>
        </div>
      }
    >
      <SurveyClientContent />
    </Suspense>
  )
}
