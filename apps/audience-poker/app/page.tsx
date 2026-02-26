'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AudiencePokerHome() {
  const router = useRouter()
  useEffect(() => {
    // If no activity in URL, could fetch list and redirect to first, or show list. For now redirect to a placeholder so user must use ?activity=id
    const params = new URLSearchParams(window.location.search)
    const activityId = params.get('activity')
    if (activityId) {
      router.replace(`/activity/${activityId}`)
    }
  }, [router])
  return (
    <div className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
      <p className="text-slate-600">
        Open an activity from the dashboard, or add <code className="rounded bg-slate-200 px-1">?activity=ID</code> to the URL.
      </p>
    </div>
  )
}
