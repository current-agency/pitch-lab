'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Button } from '@repo/ui'
import type { ImageChoiceAssessment } from '@/components/apps/image-choice/types'
import { getMediaUrl } from '@/components/apps/image-choice/types'

type Phase = 'loading' | 'list' | 'pair' | 'done' | 'error'

const API = {
  assessments: '/api/apps/image-choice/assessments',
  assessment: (id: string) => `/api/apps/image-choice/assessment/${id}`,
  submission: (id: string) => `/api/apps/image-choice/submission?assessment=${encodeURIComponent(id)}`,
  responses: '/api/apps/image-choice/responses',
}

function ImageChoiceContent() {
  const searchParams = useSearchParams()
  const assessmentId = searchParams.get('assessment')

  const [phase, setPhase] = useState<Phase>('loading')
  const [assessment, setAssessment] = useState<ImageChoiceAssessment | null>(null)
  const [list, setList] = useState<{ docs: { id: string; title: string }[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pairIndex, setPairIndex] = useState(0)
  const [selected, setSelected] = useState<'left' | 'right' | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [pausedAt, setPausedAt] = useState<number | null>(null)
  const [totalPausedMs, setTotalPausedMs] = useState(0)
  const [tick, setTick] = useState(0)
  const [results, setResults] = useState<{ pairIndex: number; side: 'left' | 'right'; elapsedMs: number }[]>([])
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [existingCompletedAt, setExistingCompletedAt] = useState<string | null>(null)
  const saveSubmittedRef = useRef(false)

  useEffect(() => {
    if (phase !== 'done' || !assessment || results.length === 0 || saveSubmittedRef.current) return
    saveSubmittedRef.current = true
    setSaveStatus('saving')
    fetch(API.responses, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ assessmentId: assessment.id, responses: results }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error((d as { error?: string }).error || res.statusText)))
      })
      .then(() => setSaveStatus('saved'))
      .catch((err) => {
        setSaveError(err instanceof Error ? err.message : String(err))
        setSaveStatus('error')
      })
  }, [phase, assessment, results])

  useEffect(() => {
    if (startTime === null || !assessment || phase !== 'pair' || isPaused) return
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [startTime, assessment, phase, pairIndex, isPaused])

  const loadList = useCallback(async () => {
    const res = await fetch(API.assessments, { credentials: 'include' })
    if (!res.ok) {
      setError(await res.text())
      setPhase('error')
      return
    }
    const data = await res.json()
    setList(data)
    if (data.docs?.length === 0) {
      setPhase('list')
      return
    }
    if (data.docs?.length === 1 && !assessmentId) {
      window.location.href = `/dashboard/apps/image-choice?assessment=${data.docs[0].id}`
      return
    }
    setPhase('list')
  }, [assessmentId])

  const loadAssessment = useCallback(async (id: string) => {
    const [assessmentRes, submissionRes] = await Promise.all([
      fetch(API.assessment(id), { credentials: 'include' }),
      fetch(API.submission(id), { credentials: 'include' }),
    ])
    if (!assessmentRes.ok) {
      setError(await assessmentRes.text())
      setPhase('error')
      return
    }
    const data = await assessmentRes.json()
    setAssessment(data)

    const sub = submissionRes.ok ? await submissionRes.json().catch(() => null) : null
    const existing = sub as { responses?: { pairIndex: number; side: 'left' | 'right'; elapsedMs: number }[]; completedAt?: string } | null
    if (existing?.responses && Array.isArray(existing.responses) && existing.responses.length > 0) {
      setResults(existing.responses)
      setExistingCompletedAt(existing.completedAt ?? null)
      setSaveStatus('saved')
      saveSubmittedRef.current = true
      setPhase('done')
    } else {
      setPhase('pair')
    }
  }, [])

  useEffect(() => {
    if (assessmentId) {
      loadAssessment(assessmentId)
    } else {
      loadList()
    }
  }, [assessmentId, loadAssessment, loadList])

  const handleBeginPair = () => setStartTime(Date.now())

  const handlePauseResume = () => {
    if (isPaused && pausedAt != null) {
      setTotalPausedMs((prev) => prev + (Date.now() - pausedAt))
      setIsPaused(false)
      setPausedAt(null)
    } else {
      setPausedAt(Date.now())
      setIsPaused(true)
    }
  }

  const handleSelect = (side: 'left' | 'right') => {
    if (startTime === null || !assessment) return
    const elapsed = Date.now() - startTime - totalPausedMs
    setSelected(side)
    setResults((prev) => [...prev, { pairIndex, side, elapsedMs: elapsed }])
    const nextIndex = pairIndex + 1
    if (nextIndex >= assessment.imagePairs.length) {
      setPhase('done')
      return
    }
    setTimeout(() => {
      setPairIndex(nextIndex)
      setStartTime(Date.now())
      setSelected(null)
      setIsPaused(false)
      setPausedAt(null)
      setTotalPausedMs(0)
    }, 800)
  }

  if (phase === 'loading') {
    return (
      <div className="mx-auto max-w-[67.76rem] space-y-4">
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-slate-600">Loading…</p>
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="mx-auto max-w-[67.76rem]">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">This or That</h1>
        <p className="text-red-600">{error ?? 'Something went wrong.'}</p>
        <Button className="mt-4" onClick={() => { setPhase('loading'); loadList(); }}>Back</Button>
      </div>
    )
  }

  if (phase === 'list') {
    const docs = list?.docs ?? []
    return (
      <div className="mx-auto max-w-[67.76rem]">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">This or That</h1>
        {docs.length === 0 ? (
          <p className="text-slate-600">No active assessments. Create one in the CMS.</p>
        ) : (
          <>
            <p className="mb-6 text-slate-600">Choose an assessment:</p>
            <ul className="space-y-2">
              {docs.map((doc) => (
                <li key={doc.id}>
                  <a
                    href={`/dashboard/apps/image-choice?assessment=${doc.id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {doc.title}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    )
  }

  if (phase === 'done' && assessment) {
    const selectedImages = results.map((r) => {
      const pair = assessment.imagePairs[r.pairIndex]
      if (!pair) return null
      const media = r.side === 'left' ? pair.imageLeft : pair.imageRight
      const url = getMediaUrl(media)
      const alt =
        typeof media !== 'string' && media?.alt
          ? media.alt
          : r.side === 'left'
            ? 'Left option'
            : 'Right option'
      const pairTitle = pair.pairTitle || `Pair ${r.pairIndex + 1}`
      return { url, alt, pairTitle, pairIndex: r.pairIndex }
    }).filter(Boolean) as { url: string | null; alt: string; pairTitle: string; pairIndex: number }[]

    return (
      <div className="mx-auto max-w-[67.76rem]">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">{assessment.title}</h1>
        <p className="text-slate-700">Thank you. You completed all {assessment.imagePairs.length} pair(s).</p>
        {existingCompletedAt && (
          <p className="mt-2 text-sm text-slate-500">Completed on {new Date(existingCompletedAt).toLocaleDateString()}</p>
        )}
        {!existingCompletedAt && results.length > 0 && (
          <p className="mt-2 text-sm text-slate-500">
            {(saveStatus === 'idle' || saveStatus === 'saving') && 'Saving responses…'}
            {saveStatus === 'saved' && 'Responses saved.'}
            {saveStatus === 'error' && saveError && (
              <span className="text-red-600">Could not save responses: {saveError}</span>
            )}
          </p>
        )}
        {selectedImages.length > 0 && (
          <section className="mt-8" aria-label="Your selections">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Your selections</h2>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {selectedImages.map(({ url, alt, pairTitle, pairIndex }) => (
                <li key={pairIndex} className="flex flex-col gap-1">
                  <div className="relative aspect-video overflow-hidden rounded-lg border border-slate-300 bg-slate-100">
                    {url ? (
                      <Image
                        src={url}
                        alt={alt}
                        fill
                        className="object-contain"
                        unoptimized={url.startsWith('http://localhost')}
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-slate-500 text-sm">No image</span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-slate-700">{pairTitle}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    )
  }

  if (phase === 'pair' && assessment) {
    const pair = assessment.imagePairs[pairIndex]
    if (!pair) return null
    const leftUrl = getMediaUrl(pair.imageLeft)
    const rightUrl = getMediaUrl(pair.imageRight)
    const durationSec = assessment.duration
    const timerStarted = startTime !== null
    const imageButtonsDisabled = !timerStarted || selected !== null || isPaused
    const effectiveElapsedMs =
      timerStarted && startTime != null
        ? (isPaused && pausedAt != null ? pausedAt - startTime : Date.now() - startTime) - totalPausedMs
        : 0
    const remainingSec =
      timerStarted && startTime != null
        ? Math.max(0, durationSec - Math.floor(effectiveElapsedMs / 1000))
        : durationSec

    return (
      <div className="mx-auto max-w-[67.76rem]">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">{assessment.title}</h1>
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-slate-600">
            Pair {pairIndex + 1} of {assessment.imagePairs.length}
            {pair.pairTitle ? ` · ${pair.pairTitle}` : ''}
          </p>
          <div className="flex items-center gap-2">
            {timerStarted && (
              <Button
                type="button"
                variant={isPaused ? 'default' : 'outline'}
                size="sm"
                onClick={handlePauseResume}
                aria-label={isPaused ? 'Resume timer' : 'Pause timer'}
              >
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
            )}
            <div
              aria-live="polite"
              aria-label={timerStarted ? `${remainingSec} seconds remaining` : `${durationSec} seconds per pair`}
            >
              <span className="flex h-10 min-w-10 items-center justify-center rounded-lg bg-black/80 px-2.5 text-lg font-bold tabular-nums text-white">
                {remainingSec}
              </span>
            </div>
          </div>
        </div>
        {pair.question && (
          <p className="mb-4 font-medium text-slate-700">{pair.question}</p>
        )}
        <div className="grid grid-cols-2 gap-6">
          <button
            type="button"
            onClick={() => handleSelect('left')}
            disabled={imageButtonsDisabled}
            className="relative aspect-video overflow-hidden rounded-lg border-2 border-slate-300 bg-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {leftUrl ? (
              <Image
                src={leftUrl}
                alt={typeof pair.imageLeft !== 'string' && pair.imageLeft?.alt ? pair.imageLeft.alt : 'Left option'}
                fill
                className="object-contain"
                unoptimized={leftUrl.startsWith('http://localhost')}
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <span className="flex h-full items-center justify-center text-slate-600">Image A</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleSelect('right')}
            disabled={imageButtonsDisabled}
            className="relative aspect-video overflow-hidden rounded-lg border-2 border-slate-300 bg-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {rightUrl ? (
              <Image
                src={rightUrl}
                alt={typeof pair.imageRight !== 'string' && pair.imageRight?.alt ? pair.imageRight.alt : 'Right option'}
                fill
                className="object-contain"
                unoptimized={rightUrl.startsWith('http://localhost')}
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <span className="flex h-full items-center justify-center text-slate-600">Image B</span>
            )}
          </button>
        </div>
        {!timerStarted ? (
          <div className="mt-6">
            <Button onClick={handleBeginPair}>Begin</Button>
            <p className="mt-2 text-sm text-slate-500">Click Begin when you&apos;re ready — your response time will start.</p>
          </div>
        ) : null}
      </div>
    )
  }

  return null
}

export function ImageChoiceClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-slate-600">Loading…</p>
        </div>
      }
    >
      <ImageChoiceContent />
    </Suspense>
  )
}
