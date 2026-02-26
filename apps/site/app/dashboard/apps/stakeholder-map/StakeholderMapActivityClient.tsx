'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { StakeholderMap } from '@/components/apps/stakeholder-map/StakeholderMap'

export function StakeholderMapActivityClient() {
  const searchParams = useSearchParams()
  const activityId = searchParams.get('activity')

  if (!activityId) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <Link href="/dashboard" className="mb-4 inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
          ← Back to dashboard
        </Link>
        <p className="font-semibold">Missing activity</p>
        <p className="mt-2 text-sm">
          Open the Stakeholder Map from your dashboard by clicking a Stakeholder Map card. The link
          includes the activity to load.
        </p>
      </div>
    )
  }

  return <StakeholderMap activityId={activityId} />
}
