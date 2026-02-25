'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Button } from '@repo/ui'
import type { ImageChoiceAssessment } from './types'
import { getMediaUrl, instructionsToText } from './types'

type Phase = 'loading' | 'list' | 'instructions' | 'pair' | 'done' | 'error'

function ImageChoicePageContent() {
  const searchParams = useSearchParams()
  const assessmentId = searchParams.get('assessment')

  const [phase, setPhase] = useState<Phase>('loading')
  const [assessment, setAssessment] = useState<ImageChoiceAssessment | null>(null)
  const [list, setList] = useState<{ docs: { id: string; title: string }[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [pairIndex, setPairIndex] = useState(0)
  const [selected, setSelected] = useState<'left' | 'right' | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [results, setResults] = useState<{ pairIndex: number; side: 'left' | 'right'; elapsedMs: number }[]>([])

  const loadList = useCallback(async () => {
    const res = await fetch('/api/assessments')
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
      window.location.href = `?assessment=${data.docs[0].id}`
      return
    }
    setPhase('list')
  }, [assessmentId])

  const loadAssessment = useCallback(async (id: string) => {
    const res = await fetch(`/api/assessment/${id}`)
    if (!res.ok) {
      setError(await res.text())
      setPhase('error')
      return
    }
    const data = await res.json()
    setAssessment(data)
    setPhase('instructions')
  }, [])

  useEffect(() => {
    if (assessmentId) {
      loadAssessment(assessmentId)
    } else {
      loadList()
    }
  }, [assessmentId, loadAssessment, loadList])

  const handleStart = () => {
    setStartTime(Date.now())
    setSelected(null)
    setPhase('pair')
  }

  const handleSelect = (side: 'left' | 'right') => {
    if (startTime === null || !assessment) return
    const elapsed = Date.now() - startTime
    setSelected(side)
    setResults((prev) => [...prev, { pairIndex, side, elapsedMs: elapsed }])
    // Persist result: POST to CMS (e.g. image-choice-completions or assessment results). See docs/feature-user-dashboard.md.

    const nextIndex = pairIndex + 1
    if (nextIndex >= assessment.imagePairs.length) {
      setPhase('done')
      return
    }
    setTimeout(() => {
      setPairIndex(nextIndex)
      setStartTime(Date.now())
      setSelected(null)
    }, 800)
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
        <p className="text-slate-600">Loading…</p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-6 text-2xl font-bold text-slate-900">Image choice</h1>
          <p className="text-red-600">{error ?? 'Something went wrong.'}</p>
          <Button className="mt-4" onClick={() => { setPhase('loading'); loadList(); }}>Back</Button>
        </div>
      </div>
    )
  }

  if (phase === 'list') {
    const docs = list?.docs ?? []
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-6 text-2xl font-bold text-slate-900">Image choice</h1>
          {docs.length === 0 ? (
            <p className="text-slate-600">No active assessments. Create one in the CMS.</p>
          ) : (
            <>
              <p className="mb-6 text-slate-600">Choose an assessment:</p>
              <ul className="space-y-2">
                {docs.map((doc) => (
                  <li key={doc.id}>
                    <a
                      href={`?assessment=${doc.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {doc.title}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    )
  }

  if (phase === 'instructions' && assessment) {
    const instructionsText = instructionsToText(assessment.instructions)
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-6 text-2xl font-bold text-slate-900">{assessment.title}</h1>
          {assessment.description && (
            <p className="mb-4 text-slate-600">{assessment.description}</p>
          )}
          {instructionsText && (
            <div className="mb-6 rounded-lg bg-white p-4 text-slate-700 shadow-sm">
              <h2 className="mb-2 font-semibold text-slate-900">Instructions</h2>
              <p className="whitespace-pre-wrap">{instructionsText}</p>
            </div>
          )}
          <p className="mb-6 text-slate-600">
            You will see pairs of images for {assessment.duration} seconds each. Select your preference.
          </p>
          <Button onClick={handleStart}>Start</Button>
        </div>
      </div>
    )
  }

  if (phase === 'done' && assessment) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-6 text-2xl font-bold text-slate-900">{assessment.title}</h1>
          <p className="text-slate-700">Thank you. You completed all {assessment.imagePairs.length} pair(s).</p>
          {results.length > 0 && (
            <p className="mt-2 text-sm text-slate-500">
              Responses recorded: {results.length} (not yet saved to server).
            </p>
          )}
        </div>
      </div>
    )
  }

  if (phase === 'pair' && assessment) {
    const pair = assessment.imagePairs[pairIndex]
    if (!pair) return null
    const leftUrl = getMediaUrl(pair.imageLeft)
    const rightUrl = getMediaUrl(pair.imageRight)
    const durationSec = assessment.duration

    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-2 text-2xl font-bold text-slate-900">{assessment.title}</h1>
          <p className="mb-6 text-slate-600">
            Pair {pairIndex + 1} of {assessment.imagePairs.length}
            {pair.pairTitle ? ` · ${pair.pairTitle}` : ''}
          </p>
          {pair.question && (
            <p className="mb-4 font-medium text-slate-700">{pair.question}</p>
          )}
          <div className="grid grid-cols-2 gap-6">
            <button
              type="button"
              onClick={() => handleSelect('left')}
              disabled={selected !== null}
              className="aspect-video overflow-hidden rounded-lg border-2 border-slate-300 bg-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-300 disabled:opacity-70"
            >
              {leftUrl ? (
                <Image
                  src={leftUrl}
                  alt={typeof pair.imageLeft !== 'string' && pair.imageLeft?.alt ? pair.imageLeft.alt : 'Left option'}
                  width={640}
                  height={360}
                  className="h-full w-full object-cover"
                  unoptimized={leftUrl.startsWith('http://localhost')}
                />
              ) : (
                <span className="flex h-full items-center justify-center text-slate-600">Image A</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleSelect('right')}
              disabled={selected !== null}
              className="aspect-video overflow-hidden rounded-lg border-2 border-slate-300 bg-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-300 disabled:opacity-70"
            >
              {rightUrl ? (
                <Image
                  src={rightUrl}
                  alt={typeof pair.imageRight !== 'string' && pair.imageRight?.alt ? pair.imageRight.alt : 'Right option'}
                  width={640}
                  height={360}
                  className="h-full w-full object-cover"
                  unoptimized={rightUrl.startsWith('http://localhost')}
                />
              ) : (
                <span className="flex h-full items-center justify-center text-slate-600">Image B</span>
              )}
            </button>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            {durationSec} seconds per pair · {selected ? `You selected: ${selected}` : 'Choose one'}
          </p>
        </div>
      </div>
    )
  }

  return null
}

export default function ImageChoicePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
          <p className="text-slate-600">Loading…</p>
        </div>
      }
    >
      <ImageChoicePageContent />
    </Suspense>
  )
}
