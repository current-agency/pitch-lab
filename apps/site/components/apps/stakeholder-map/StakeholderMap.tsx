'use client'

import { useCallback, useEffect, useState } from 'react'

const QUADRANTS = [
  { id: 'keep-satisfied' as const, label: 'Keep Satisfied', className: 'bg-amber-50 border-amber-200' },
  { id: 'key-players' as const, label: 'Key Players', className: 'bg-emerald-100 border-emerald-300 ring-1 ring-emerald-200' },
  { id: 'monitor' as const, label: 'Monitor', className: 'bg-slate-50 border-slate-200' },
  { id: 'keep-informed' as const, label: 'Keep Informed', className: 'bg-sky-50 border-sky-200' },
] as const

type QuadrantId = (typeof QUADRANTS)[number]['id']

export type Stakeholder = {
  id: string
  name: string
  title?: string | null
}

type ScaleValue = 'low' | 'medium' | 'high'

type Answer = {
  influence: ScaleValue | null
  interest: ScaleValue | null
  notes: string
}

function answerToQuadrant(influence: ScaleValue, interest: ScaleValue): QuadrantId {
  const highOrMidInfluence = influence === 'high' || influence === 'medium'
  const highOrMidInterest = interest === 'high' || interest === 'medium'
  if (highOrMidInfluence && highOrMidInterest) return 'key-players'
  if (highOrMidInfluence && interest === 'low') return 'keep-satisfied'
  if (influence === 'low' && highOrMidInterest) return 'keep-informed'
  return 'monitor'
}

type StakeholderMapProps = {
  activityId: string
}

const INTRO_COPY =
  'Who decides, who influences, and who needs to stay in the loop? Mapping stakeholders by influence and interest helps you communicate in the right way with each person.'

export function StakeholderMap({ activityId }: StakeholderMapProps) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [step, setStep] = useState<'intro' | 'cards' | 'reveal' | 'submitted'>('intro')
  const [cardIndex, setCardIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [placementForReveal, setPlacementForReveal] = useState<Record<string, QuadrantId>>({})
  const [submitted, setSubmitted] = useState(false)

  const fetchActivity = useCallback(async () => {
    if (!activityId) return
    setLoading(true)
    setError(null)
    try {
      const [activityRes, submissionRes] = await Promise.all([
        fetch(`/api/apps/stakeholder-map/activity/${encodeURIComponent(activityId)}`, { credentials: 'include' }),
        fetch(`/api/apps/stakeholder-map/submission?activity=${encodeURIComponent(activityId)}`, { credentials: 'include' }),
      ])
      const activityData = await activityRes.json().catch(() => ({}))
      if (!activityRes.ok) {
        setError((activityData as { error?: string }).error ?? 'Failed to load activity')
        return
      }
      const activity = activityData as { stakeholders?: Array<{ id: string; name?: string; title?: string | null }> }
      const list = activity.stakeholders ?? []
      const mapped: Stakeholder[] = list.map((s) => ({
        id: String(s.id),
        name: typeof s.name === 'string' ? s.name : 'Unnamed',
        title: s.title ?? null,
      }))
      setStakeholders(mapped)

      const submissionData = submissionRes.ok ? await submissionRes.json().catch(() => null) : null
      const sub = submissionData as { placements?: Array<{ stakeholderId: string; quadrant: string }> } | null
      if (sub?.placements && Array.isArray(sub.placements) && sub.placements.length > 0) {
        const placeMap: Record<string, QuadrantId> = {}
        sub.placements.forEach((pl) => {
          if (pl.stakeholderId && pl.quadrant && (QUADRANTS as readonly { id: string }[]).some((q) => q.id === pl.quadrant)) {
            placeMap[pl.stakeholderId] = pl.quadrant as QuadrantId
          }
        })
        if (Object.keys(placeMap).length === mapped.length) {
          const initial: Record<string, Answer> = {}
          mapped.forEach((s) => (initial[s.id] = { influence: null, interest: null, notes: '' }))
          setAnswers(initial)
          setStep('reveal')
          setPlacementForReveal(placeMap)
          setSubmitted(true)
        } else {
          const initial: Record<string, Answer> = {}
          mapped.forEach((s) => (initial[s.id] = { influence: null, interest: null, notes: '' }))
          setAnswers(initial)
        }
      } else {
        const initial: Record<string, Answer> = {}
        mapped.forEach((s) => (initial[s.id] = { influence: null, interest: null, notes: '' }))
        setAnswers(initial)
      }
    } catch {
      setError('Failed to load activity')
    } finally {
      setLoading(false)
    }
  }, [activityId])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  const currentStakeholder = stakeholders[cardIndex] ?? null
  const currentAnswer = currentStakeholder ? answers[currentStakeholder.id] : null
  const canAdvance =
    currentAnswer &&
    currentAnswer.influence != null &&
    currentAnswer.interest != null
  const isLastCard = stakeholders.length > 0 && cardIndex === stakeholders.length - 1

  const setInfluence = useCallback((id: string, value: ScaleValue) => {
    setAnswers((prev) => ({
      ...prev,
      [id]: { ...prev[id], influence: value, interest: prev[id]?.interest ?? null, notes: prev[id]?.notes ?? '' },
    }))
  }, [])

  const setInterest = useCallback((id: string, value: ScaleValue) => {
    setAnswers((prev) => ({
      ...prev,
      [id]: { ...prev[id], influence: prev[id]?.influence ?? null, interest: value, notes: prev[id]?.notes ?? '' },
    }))
  }, [])

  const setNotes = useCallback((id: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [id]: { ...prev[id], influence: prev[id]?.influence ?? null, interest: prev[id]?.interest ?? null, notes: value },
    }))
  }, [])

  const handleNext = useCallback(() => {
    if (isLastCard) {
      const placement: Record<string, QuadrantId> = {}
      stakeholders.forEach((s) => {
        const a = answers[s.id]
        if (a?.influence != null && a?.interest != null) {
          placement[s.id] = answerToQuadrant(a.influence, a.interest)
        }
      })
      setPlacementForReveal(placement)
      setStep('reveal')
    } else {
      setCardIndex((i) => i + 1)
    }
  }, [stakeholders, answers, isLastCard])

  const handleSubmit = useCallback(async () => {
    if (!activityId || Object.keys(placementForReveal).length === 0) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const placements = Object.entries(placementForReveal).map(([stakeholderId, quadrant]) => {
        const a = answers[stakeholderId]
        const payload: { stakeholderId: string; quadrant: string; notes?: string } = {
          stakeholderId,
          quadrant,
        }
        if (typeof a?.notes === 'string' && a.notes.trim() !== '') {
          payload.notes = a.notes.trim()
        }
        return payload
      })
      const res = await fetch('/api/apps/stakeholder-map/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ activity: activityId, placements }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSubmitError((data as { error?: string }).error ?? 'Failed to submit')
        return
      }
      setSubmitted(true)
      setStep('submitted')
    } catch {
      setSubmitError('Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }, [activityId, placementForReveal, answers])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-slate-600">Loading activity…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p className="font-medium">Error</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (stakeholders.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <p className="font-medium">No stakeholders in this activity</p>
          <p className="mt-1 text-sm">
            This activity has no stakeholders listed. In the CMS, open the Stakeholder Map activity and add
            stakeholders in the &quot;Stakeholders&quot; array.
          </p>
        </div>
      </div>
    )
  }

  if (step === 'intro') {
    return (
      <div className="space-y-6">
        <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-700">{INTRO_COPY}</p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setStep('cards')}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700"
            >
              Begin
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'cards' && currentStakeholder && currentAnswer) {
    const name = currentStakeholder.name
    return (
      <div className="space-y-6">
        <p className="text-sm text-slate-500">
          {cardIndex + 1} of {stakeholders.length}
        </p>
        <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">{name}</h2>
            {currentStakeholder.title ? (
              <p className="mt-1 text-sm text-slate-600">{currentStakeholder.title}</p>
            ) : null}
          </div>

          <div className="space-y-6">
            <fieldset>
              <legend className="text-sm font-medium text-slate-800">
                How much influence does {name} have on the final decisions for this project?
              </legend>
              <div className="mt-2 flex gap-3">
                {(['low', 'medium', 'high'] as const).map((value) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="influence"
                      checked={currentAnswer.influence === value}
                      onChange={() => setInfluence(currentStakeholder.id, value)}
                      className="h-4 w-4 border-slate-300 text-slate-800 focus:ring-slate-500"
                    />
                    <span className="capitalize text-slate-700">{value}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-medium text-slate-800">
                How much will this project affect {name}&apos;s day-to-day work?
              </legend>
              <div className="mt-2 flex gap-3">
                {(['low', 'medium', 'high'] as const).map((value) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="interest"
                      checked={currentAnswer.interest === value}
                      onChange={() => setInterest(currentStakeholder.id, value)}
                      className="h-4 w-4 border-slate-300 text-slate-800 focus:ring-slate-500"
                    />
                    <span className="capitalize text-slate-700">{value}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-800">
                Anything worth noting about {name}? <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <textarea
                id="notes"
                value={currentAnswer.notes}
                onChange={(e) => setNotes(currentStakeholder.id, e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                placeholder="Optional notes…"
              />
            </div>
          </div>

          <div className="mt-8">
            <button
              type="button"
              disabled={!canAdvance}
              onClick={handleNext}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 disabled:pointer-events-none disabled:opacity-50"
            >
              {isLastCard ? 'See map' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'reveal' || step === 'submitted') {
    const getStakeholder = (id: string) => stakeholders.find((s) => s.id === id)
    const showSubmit = step === 'reveal' && !submitted

    return (
      <div className="space-y-6">
        {submitted ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <p className="font-semibold">Map submitted</p>
            <p className="mt-1 text-sm">Your stakeholder map has been saved.</p>
          </div>
        ) : null}
        <div className="flex items-stretch gap-3">
          <div
            className="flex w-16 flex-shrink-0 flex-col items-center justify-between py-2 text-xs text-slate-500"
            aria-hidden
          >
            <span>High</span>
            <span className="font-medium">Influence</span>
            <span>Low</span>
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <div
              className="flex items-center justify-between text-xs text-slate-500"
              aria-hidden
            >
              <span>Low</span>
              <span className="font-medium">Interest</span>
              <span>High</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {QUADRANTS.map((q) => (
                <div key={q.id} className={`min-h-[120px] rounded-xl border-2 p-4 ${q.className}`}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {q.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(placementForReveal)
                      .filter(([, quad]) => quad === q.id)
                      .map(([stakeholderId]) => {
                        const s = getStakeholder(stakeholderId)
                        return s ? (
                          <div
                            key={stakeholderId}
                            className="flex flex-col rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm shadow-sm"
                          >
                            <span className="font-medium text-slate-900">{s.name}</span>
                            {s.title ? (
                              <span className="text-xs text-slate-600">{s.title}</span>
                            ) : null}
                          </div>
                        ) : null
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {showSubmit ? (
          <div>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 disabled:pointer-events-none disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Lock In & Submit'}
            </button>
          </div>
        ) : null}
        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
      </div>
    )
  }

  return null
}
