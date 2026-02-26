'use client'

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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

type Placement = Record<string, QuadrantId | 'unplaced'>

type StakeholderMapProps = {
  activityId: string
}

function StakeholderChip({
  stakeholder,
  isPlaced,
  isDragging,
}: {
  stakeholder: Stakeholder
  isPlaced: boolean
  isDragging?: boolean
}) {
  return (
    <div
      className={`
        flex flex-col rounded-lg border px-3 py-2 text-left text-sm shadow-sm transition
        ${isPlaced ? 'border-slate-300 bg-white' : 'border-slate-400 bg-slate-100'}
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      <span className="font-medium text-slate-900">{stakeholder.name}</span>
      {stakeholder.title ? (
        <span className="text-xs text-slate-600">{stakeholder.title}</span>
      ) : null}
    </div>
  )
}

function DraggableChip({
  id,
  stakeholder,
  isPlaced,
}: {
  id: string
  stakeholder: Stakeholder
  isPlaced: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { stakeholder },
  })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <StakeholderChip stakeholder={stakeholder} isPlaced={isPlaced} isDragging={isDragging} />
    </div>
  )
}

function SortableChip({
  id,
  stakeholder,
  isPlaced,
}: {
  id: string
  stakeholder: Stakeholder
  isPlaced: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { stakeholder },
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <StakeholderChip stakeholder={stakeholder} isPlaced={isPlaced} isDragging={isDragging} />
    </div>
  )
}

function DroppableSidebar({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unplaced' })
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 overflow-y-auto p-3 transition ${isOver ? 'ring-2 ring-inset ring-slate-400 rounded-lg' : ''}`}
    >
      {children}
    </div>
  )
}

function DroppableQuadrant({
  quadrant,
  stakeholders,
  placement,
  getStakeholder,
}: {
  quadrant: (typeof QUADRANTS)[number]
  stakeholders: Stakeholder[]
  placement: Placement
  getStakeholder: (id: string) => Stakeholder | undefined
}) {
  const { setNodeRef, isOver } = useDroppable({ id: quadrant.id })
  const idsInQuadrant = stakeholders
    .filter((s) => placement[s.id] === quadrant.id)
    .map((s) => s.id)
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[140px] rounded-xl border-2 p-4 transition ${quadrant.className} ${
        isOver ? 'ring-2 ring-slate-400 ring-offset-2' : ''
      }`}
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
        {quadrant.label}
      </p>
      <div className="flex flex-wrap gap-2">
        {idsInQuadrant.map((id) => {
          const s = getStakeholder(id)
          return s ? <DraggableChip key={id} id={id} stakeholder={s} isPlaced /> : null
        })}
      </div>
    </div>
  )
}

export function StakeholderMap({ activityId }: StakeholderMapProps) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [placement, setPlacement] = useState<Placement>({})
  const [activeId, setActiveId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const fetchActivity = useCallback(async () => {
    if (!activityId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/apps/stakeholder-map/activity/${encodeURIComponent(activityId)}`, {
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((data as { error?: string }).error ?? 'Failed to load activity')
        return
      }
      const activity = data as { stakeholders?: Array<{ id: string; name?: string; title?: string | null }> }
      const list = activity.stakeholders ?? []
      const mapped: Stakeholder[] = list.map((s) => ({
        id: String(s.id),
        name: typeof s.name === 'string' ? s.name : 'Unnamed',
        title: s.title ?? null,
      }))
      setStakeholders(mapped)
      const p: Placement = {}
      mapped.forEach((s) => (p[s.id] = 'unplaced'))
      setPlacement(p)
    } catch {
      setError('Failed to load activity')
    } finally {
      setLoading(false)
    }
  }, [activityId])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  const getStakeholder = useCallback(
    (id: string) => stakeholders.find((s) => s.id === id),
    [stakeholders]
  )

  const unplacedIds = stakeholders.filter((s) => placement[s.id] === 'unplaced').map((s) => s.id)
  const allPlaced = stakeholders.length > 0 && unplacedIds.length === 0

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)
      if (!over) return
      const stakeholderId = String(active.id)
      let targetId = String(over.id)
      const validQuadrants = QUADRANTS.map((q) => q.id)
      if (targetId !== 'unplaced' && !validQuadrants.includes(targetId as QuadrantId)) {
        targetId = placement[targetId] ?? 'unplaced'
      }
      if (targetId === 'unplaced' || validQuadrants.includes(targetId as QuadrantId)) {
        setPlacement((prev) => ({ ...prev, [stakeholderId]: targetId as QuadrantId | 'unplaced' }))
      }
    },
    [placement]
  )

  const handleSubmit = useCallback(async () => {
    if (!allPlaced || !activityId) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/apps/stakeholder-map/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          activity: activityId,
          placements: Object.entries(placement)
            .filter(([, q]) => q !== 'unplaced')
            .map(([stakeholderId, quadrant]) => ({ stakeholderId, quadrant })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSubmitError((data as { error?: string }).error ?? 'Failed to submit')
        return
      }
      setSubmitted(true)
    } catch {
      setSubmitError('Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }, [activityId, placement, allPlaced])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-slate-600">Loading activity…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        <p className="font-medium">Error</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    )
  }

  if (stakeholders.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
        <p className="font-medium">No stakeholders in this activity</p>
        <p className="mt-1 text-sm">
          This activity has no stakeholders listed. In the CMS, open the Stakeholder Map activity and add
          stakeholders in the &quot;Stakeholders&quot; array.
        </p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <p className="font-semibold">Map submitted</p>
          <p className="mt-1 text-sm">Your stakeholder map has been saved.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {QUADRANTS.map((q) => (
            <div key={q.id} className={`rounded-xl border-2 p-4 ${q.className}`}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                {q.label}
              </p>
              <ul className="list-inside list-disc text-sm text-slate-700">
                {stakeholders
                  .filter((s) => placement[s.id] === q.id)
                  .map((s) => (
                    <li key={s.id}>
                      {s.name}
                      {s.title ? ` — ${s.title}` : ''}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-[calc(100vh-8rem)] gap-6">
        <div
          className="flex w-56 shrink-0 flex-col overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50/80"
          aria-label="Unplaced stakeholders"
        >
          <p className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Stakeholders
          </p>
          <DroppableSidebar>
            <SortableContext items={unplacedIds} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {unplacedIds.map((id) => {
                  const s = getStakeholder(id)
                  return s ? (
                    <SortableChip key={id} id={id} stakeholder={s} isPlaced={false} />
                  ) : null
                })}
              </div>
            </SortableContext>
          </DroppableSidebar>
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div className="text-center text-xs text-slate-500">
            <span className="font-medium">Interest</span> ← Low — — — High →
          </div>
          <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-4">
            {QUADRANTS.map((q) => (
              <DroppableQuadrant
                key={q.id}
                quadrant={q}
                stakeholders={stakeholders}
                placement={placement}
                getStakeholder={getStakeholder}
              />
            ))}
          </div>
          <p className="text-center text-xs text-slate-500">
            ↑ Influence High — — — Low ↓
          </p>
          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <p className="text-sm text-slate-600">
              {unplacedIds.length} of {stakeholders.length} placed
            </p>
            <button
              type="button"
              disabled={!allPlaced || submitting}
              onClick={handleSubmit}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 disabled:pointer-events-none disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Lock In & Submit'}
            </button>
          </div>
          {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
        </div>
      </div>

      <DragOverlay>
        {activeId ? (() => {
          const s = getStakeholder(activeId)
          return s ? (
            <StakeholderChip stakeholder={s} isPlaced={placement[activeId] !== 'unplaced'} />
          ) : null
        })() : null}
      </DragOverlay>
    </DndContext>
  )
}
