'use client'

import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

type CompletionItem = { type: string; entityId: string; title: string; submissionId: string }

function getUserIdFromPath(pathname: string | null): string | null {
  if (!pathname) return null
  const segments = pathname.split('/').filter(Boolean)
  const usersIndex = segments.indexOf('users')
  if (usersIndex === -1 || usersIndex >= segments.length - 1) return null
  const id = segments[usersIndex + 1]
  return id && id !== 'create' ? id : null
}

export function UserActivityResetField() {
  const pathname = usePathname()
  const userId = getUserIdFromPath(pathname)
  const [items, setItems] = useState<CompletionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resettingId, setResettingId] = useState<string | null>(null)

  const fetchCompletions = useCallback(async () => {
    if (!userId) {
      setItems([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/user-activity-completions?userId=${encodeURIComponent(userId)}`, {
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error || res.statusText)
      }
      const data = await res.json()
      setItems((data.items ?? []) as CompletionItem[])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchCompletions()
  }, [fetchCompletions])

  const handleReset = useCallback(
    async (item: CompletionItem) => {
      if (!userId) return
      setResettingId(item.submissionId)
      try {
        const res = await fetch('/api/reset-user-activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            userId,
            activityType: item.type,
            submissionId: item.submissionId,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error((data as { error?: string }).error || res.statusText)
        }
        await fetchCompletions()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setResettingId(null)
      }
    },
    [userId, fetchCompletions],
  )

  if (!userId) {
    return (
      <div style={{ padding: '0.75rem 0', color: 'var(--theme-elevation-600)' }}>
        Save the user first to view and reset completed activities.
      </div>
    )
  }

  if (loading && items.length === 0) {
    return (
      <div style={{ padding: '0.75rem 0', color: 'var(--theme-elevation-600)' }}>
        Loading completed activities…
      </div>
    )
  }

  return (
    <div style={{ padding: '0.75rem 0' }}>
      {error && (
        <p style={{ color: 'var(--theme-error-500)', marginBottom: '0.5rem' }}>{error}</p>
      )}
      <p style={{ marginBottom: '0.75rem', color: 'var(--theme-elevation-600)', fontSize: '13px' }}>
        Reset an activity to allow this user to complete it again. The existing submission will be
        deleted.
      </p>
      {items.length === 0 ? (
        <p style={{ color: 'var(--theme-elevation-600)' }}>No completed activities.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {items.map((item) => (
            <li
              key={`${item.type}-${item.submissionId}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0.5rem 0',
                borderBottom: '1px solid var(--theme-elevation-150)',
              }}
            >
              <span style={{ fontWeight: 500 }}>{item.title}</span>
              <span style={{ fontSize: '12px', color: 'var(--theme-elevation-500)' }}>
                {item.type === 'image-choice' && 'This or That'}
                {item.type === 'audience-poker' && 'Audience Poker'}
                {item.type === 'stakeholder-map' && 'Stakeholder Map'}
                {item.type === 'survey' && 'Platform Fit'}
              </span>
              <button
                type="button"
                onClick={() => handleReset(item)}
                disabled={resettingId !== null}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '12px',
                  cursor: resettingId !== null ? 'not-allowed' : 'pointer',
                  opacity: resettingId === item.submissionId ? 0.7 : 1,
                }}
              >
                {resettingId === item.submissionId ? 'Resetting…' : 'Reset'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
