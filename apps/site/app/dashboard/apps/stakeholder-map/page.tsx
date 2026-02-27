import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { requireAuth } from '@/lib/auth'
import { StakeholderMapActivityClient } from './StakeholderMapActivityClient'

export default async function StakeholderMapAppPage() {
  const cookieStore = await cookies()
  requireAuth(cookieStore)

  return (
    <div className="min-h-screen bg-stone-100 p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Stakeholder Map</h1>
        <p className="text-sm text-slate-600">
          Map each stakeholder by influence and interest, then see your 2×2 matrix.
        </p>
        <Suspense
          fallback={
            <div className="flex min-h-[60vh] items-center justify-center">
              <p className="text-slate-600">Loading…</p>
            </div>
          }
        >
          <StakeholderMapActivityClient />
        </Suspense>
      </div>
    </div>
  )
}
