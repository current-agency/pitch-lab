'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { StakeholderMap } from '../components/StakeholderMap'

function StakeholderMapPageInner() {
  const searchParams = useSearchParams()
  const activityId = searchParams.get('activity')
  const token = searchParams.get('token')

  if (!activityId || !token) {
    const missing = [!activityId && 'activity', !token && 'token'].filter(Boolean).join(' and ')
    return (
      <div className="mx-auto max-w-md rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <p className="font-semibold">Missing {missing}</p>
        <p className="mt-2 text-sm">
          Open the Stakeholder Map from your PitchLab dashboard (log in at the site, then click the
          Stakeholder Map card). The link from the dashboard includes everything needed.
        </p>
        <p className="mt-3 text-xs text-amber-700">
          If you came from the dashboard and still see this, ask your admin to set{' '}
          <code className="rounded bg-amber-100 px-1">ACTIVITY_LINK_SECRET</code> in both the site
          and this app.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-100 p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Stakeholder Map</h1>
        <p className="text-sm text-slate-600">
          Drag stakeholders from the list into the quadrants by influence and interest.
        </p>
        <StakeholderMap activityId={activityId} token={token} />
      </div>
    </div>
  )
}

export default function StakeholderMapPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-slate-600">Loading…</p>
        </div>
      }
    >
      <StakeholderMapPageInner />
    </Suspense>
  )
}
