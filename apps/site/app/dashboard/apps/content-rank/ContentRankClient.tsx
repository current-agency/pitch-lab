'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { ContentRankInstance, RankedPage } from '@/components/apps/content-rank/types'

const fetchOpts = { credentials: 'include' as const }

const CATEGORY_COLORS: Record<string, string> = {
  KEEP: 'bg-emerald-100 text-emerald-800',
  KILL: 'bg-rose-100 text-rose-800',
  MERGE: 'bg-amber-100 text-amber-800',
}

function ContentRankContent() {
  const searchParams = useSearchParams()
  const instanceId = useMemo(() => searchParams.get('instance')?.trim() ?? null, [searchParams])

  const [instance, setInstance] = useState<ContentRankInstance | null>(null)
  const [pages, setPages] = useState<RankedPage[]>([])
  const [loadingInstance, setLoadingInstance] = useState(true)
  const [loadingPages, setLoadingPages] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!instanceId) {
      setError('Missing instance')
      setLoadingInstance(false)
      return
    }

    let cancelled = false
    setLoadingInstance(true)
    setError(null)

    fetch(`/api/apps/content-rank/instance/${encodeURIComponent(instanceId)}`, fetchOpts)
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error((d as { error?: string }).error || res.statusText)))
        return res.json() as Promise<ContentRankInstance>
      })
      .then((data) => {
        if (!cancelled) setInstance(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoadingInstance(false)
      })

    return () => {
      cancelled = true
    }
  }, [instanceId])

  useEffect(() => {
    if (!instanceId || !instance) return

    let cancelled = false
    setLoadingPages(true)
    setError(null)

    fetch(`/api/apps/content-rank/result?id=${encodeURIComponent(instanceId)}`, fetchOpts)
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error((d as { error?: string }).error || res.statusText)))
        return res.json() as Promise<{ pages?: RankedPage[] }>
      })
      .then((data) => {
        if (!cancelled) setPages(data.pages ?? [])
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoadingPages(false)
      })

    return () => {
      cancelled = true
    }
  }, [instanceId, instance])

  if (loadingInstance && !instance) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
        <p className="text-slate-600">Loading...</p>
      </div>
    )
  }

  if (error && !instance) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <p className="font-medium">Could not load content rank</p>
          <p className="mt-1 text-sm">{error}</p>
          <Link href="/dashboard" className="mt-4 inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!instanceId) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
        <p className="text-slate-600">Missing instance. Open from the dashboard.</p>
        <Link href="/dashboard" className="ml-4 inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
          ← Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-100 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/dashboard" className="mb-4 inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
              ← Back to dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">{instance?.title ?? 'Content rank'}</h1>
            <p className="mt-1 text-sm text-slate-600">
              Rank pages from ScreamingFrog + GA4: move, lost, reuse
            </p>
          </div>
        </div>

        {loadingPages && pages.length === 0 ? (
          <p className="text-slate-600">Loading pages...</p>
        ) : error && pages.length === 0 ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
            <p>{error}</p>
          </div>
        ) : pages.length === 0 ? (
          <p className="text-slate-600">No pages in this instance. Upload CSVs in the CMS.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Path</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-700">Category</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-700">Views</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-700">Engagement</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-700">Words</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Reasons</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-700 underline hover:text-slate-900"
                        >
                          {row.path || row.url}
                        </a>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                            CATEGORY_COLORS[row.category] ?? 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {row.category}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                        {Number(row.views ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                        {row.engagementTimeSec != null ? `${row.engagementTimeSec}s` : '—'}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                        {row.wordCount ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {Array.isArray(row.reasons) ? row.reasons.join('; ') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ContentRankClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
          <p className="text-slate-600">Loading...</p>
        </div>
      }
    >
      <ContentRankContent />
    </Suspense>
  )
}
