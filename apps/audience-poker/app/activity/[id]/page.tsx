'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { Button, cn } from '@repo/ui'
import { validate } from '../../../lib/validate'
import type { AudiencePokerActivity } from '../../types'
import { instructionsToText } from '../../types'

export default function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [activity, setActivity] = useState<AudiencePokerActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allocations, setAllocations] = useState<number[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [hasPlacedBet, setHasPlacedBet] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/activity/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Activity not found' : res.statusText)
        return res.json()
      })
      .then((data: AudiencePokerActivity) => {
        setActivity(data)
        const n = (data.audiences || []).length
        setAllocations(n ? Array(n).fill(0) : [])
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [id])

  const token = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('token') : null
  useEffect(() => {
    if (!token) return
    try {
      const parts = token.split('.')
      const payloadB64 = parts[0]
      if (parts.length !== 2 || !payloadB64) return
      const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
      if (payload.userId) setUserId(payload.userId)
    } catch {
      // ignore
    }
  }, [token])

  const handleReset = useCallback(() => {
    const n = (activity?.audiences || []).length
    setAllocations(n ? Array(n).fill(0) : [])
    setHasPlacedBet(false)
  }, [activity?.audiences?.length])

  const handleAllocationChange = useCallback((index: number, delta: number) => {
    setAllocations((prev) => {
      const next = [...prev]
      const chipBudget = activity?.chipBudget ?? 0
      const othersSum = next.reduce((s, v, i) => (i === index ? s : s + v), 0)
      const maxForThis = chipBudget - othersSum
      const current = next[index] ?? 0
      const newVal = Math.max(0, Math.min(maxForThis, current + delta))
      next[index] = newVal
      return next
    })
  }, [activity?.chipBudget])

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!submitted && allocations.some((a) => a > 0)) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [submitted, allocations])

  const handleSubmit = useCallback(() => {
    if (!activity || !id) return
    const result = validate(allocations, activity.chipBudget)
    if (!result.canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    const payload = {
      activityId: id,
      token: token ?? undefined,
      allocations: (activity.audiences || []).map((aud, i) => ({
        audienceIndex: i,
        audienceLabel: typeof aud === 'object' ? aud.label : 'Audience',
        chips: allocations[i] ?? 0,
      })),
    }
    fetch('/api/audience-poker/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (res.status === 409) {
          setSubmitted(true)
          return
        }
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.error || res.statusText)))
      })
      .then(() => setSubmitted(true))
      .catch((err) => setSubmitError(err instanceof Error ? err.message : String(err)))
      .finally(() => setSubmitting(false))
  }, [activity, id, allocations, token])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
        <p className="text-slate-600">Loading…</p>
      </div>
    )
  }

  if (error || !activity) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold text-slate-900">Audience Poker</h1>
          <p className="mt-4 text-red-600">{error ?? 'Activity not found.'}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
        <div className="mx-auto max-w-md rounded-xl bg-white p-8 shadow-sm text-center">
          <h2 className="text-xl font-bold text-slate-900">Your chips are in.</h2>
          <p className="mt-2 text-slate-600">Thanks for participating.</p>
        </div>
      </div>
    )
  }

  const n = (activity.audiences || []).length
  const chipBudget = activity.chipBudget
  const result = validate(allocations, chipBudget)
  const instructionsText = instructionsToText(activity.instructions)
  const duplicateValues = new Set<number>()
  if (hasPlacedBet && result.errors.duplicateValues) {
    const byValue = new Map<number, number[]>()
    allocations.forEach((v, i) => {
      if (!byValue.has(v)) byValue.set(v, [])
      byValue.get(v)!.push(i)
    })
    byValue.forEach((indices) => {
      if (indices.length > 1) indices.forEach((i) => duplicateValues.add(i))
    })
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-900">{activity.title}</h1>
        {instructionsText ? (
          <div className="mt-4 rounded-lg bg-white p-4 text-slate-700 shadow-sm">
            <p className="whitespace-pre-wrap">{instructionsText}</p>
          </div>
        ) : null}

        <div
          className={cn(
            'mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3 text-lg font-medium',
            result.chipsRemaining < 0
              ? 'bg-red-100 text-red-800'
              : result.canSubmit
                ? 'bg-green-100 text-green-800'
                : 'bg-slate-200 text-slate-800',
          )}
        >
          <div className="flex flex-wrap items-center gap-5">
            <span>
              {result.chipsRemaining < 0
                ? `${Math.abs(result.chipsRemaining)} over budget`
                : `${result.chipsRemaining} chips remaining`}
            </span>
            {result.chipsRemaining > 0 ? (
              <div className="flex flex-wrap gap-1.5" aria-hidden>
                {Array.from({ length: result.chipsRemaining }, (_, i) => (
                  <span
                    key={i}
                    className="h-4 w-4 shrink-0 rounded-full border-2 border-amber-600/50 bg-amber-400 shadow-sm"
                    title="Chip"
                  />
                ))}
              </div>
            ) : null}
          </div>
          {allocations.some((a) => a > 0) ? (
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset
            </Button>
          ) : null}
        </div>

        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(activity.audiences || []).map((aud, index) => (
            <li
              key={index}
              className={cn(
                'flex h-52 flex-col rounded-2xl border-2 bg-white p-5 shadow-sm',
                duplicateValues.has(index) ? 'border-amber-400 bg-amber-50' : 'border-slate-200',
              )}
            >
              <div className="flex flex-1 flex-col gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {typeof aud === 'object' ? aud.label : `Audience ${index + 1}`}
                  </h3>
                  {typeof aud === 'object' && aud.description ? (
                    <p className="mt-1 text-sm text-slate-600">{aud.description}</p>
                  ) : null}
                  {duplicateValues.has(index) ? (
                    <p className="mt-1 text-sm text-amber-700">Two audiences can&apos;t tie</p>
                  ) : null}
                </div>
                {(allocations[index] ?? 0) > 0 ? (
                  <div className="flex flex-wrap gap-2" aria-hidden>
                    {Array.from({ length: allocations[index] ?? 0 }, (_, i) => (
                      <span
                        key={i}
                        className="h-4 w-4 shrink-0 rounded-full border-2 border-amber-600/50 bg-amber-400 shadow-sm"
                        title="Chip"
                      />
                    ))}
                  </div>
                ) : null}
                <div className="mt-auto flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleAllocationChange(index, -1)}
                    disabled={(allocations[index] ?? 0) <= 0}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Decrease chips"
                  >
                    −
                  </button>
                  <span className="min-w-[3rem] text-center text-xl font-bold tabular-nums text-slate-900">
                    {allocations[index] ?? 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAllocationChange(index, 1)}
                    disabled={
                      (allocations[index] ?? 0) >=
                      chipBudget - allocations.reduce((s, v, i) => (i === index ? s : s + (v ?? 0)), 0)
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Increase chips"
                  >
                    +
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {submitError ? (
          <p className="mt-4 text-red-600">{submitError}</p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          {!hasPlacedBet ? (
            <Button
              onClick={() => setHasPlacedBet(true)}
              disabled={result.totalSpent !== chipBudget || result.chipsRemaining !== 0}
            >
              Place my Bet
            </Button>
          ) : (
            <>
              <Button
                onClick={handleSubmit}
                disabled={!result.canSubmit || submitting}
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setHasPlacedBet(false)}
              >
                Change my bet
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
