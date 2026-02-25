'use client'

import { useState } from 'react'
import type { SurveyQuestion, SurveyAnswers, SurveyAnswerValue } from '../types'

type Props = {
  question: SurveyQuestion
  value: SurveyAnswerValue | undefined
  onChange: (key: string, value: SurveyAnswerValue) => void
}

function getOptionLabel(question: SurveyQuestion, value: string): string {
  const opt = question.options?.find((o) => o.value === value)
  return opt?.label ?? value ?? ''
}

export function QuestionRenderer({ question, value, onChange }: Props) {
  const key = question.questionKey
  const required = question.required !== false

  if (question.inputType === 'multi-select') {
    const options = question.options ?? []
    const raw = (Array.isArray(value) ? value : value ? [String(value)] : []) as string[]
    const optionValues = options.map((o) => o.value)
    let selected = raw.filter((v) => optionValues.includes(v))

    // "None of the above" is mutually exclusive: when selected, no other options can be chosen
    const noneOption = options.find((o) => /none\s+of\s+the\s+above/i.test(o.label))
    const isNoneSelected = noneOption != null && selected.includes(noneOption.value)
    if (isNoneSelected) {
      selected = [noneOption.value]
    }

    const otherText = raw.includes('other') ? (raw[raw.indexOf('other') + 1] ?? '') : ''
    const toggle = (v: string) => {
      if (v === 'other') {
        if (isNoneSelected) return // other is disabled when "none" is selected
        if (selected.includes('other')) {
          const i = raw.indexOf('other')
          const next = raw.slice(0, i).concat(raw.slice(i + 2))
          onChange(key, next)
        } else {
          onChange(key, [...raw, 'other', ''])
        }
        return
      }
      if (noneOption && v === noneOption.value) {
        if (selected.includes(v)) {
          onChange(key, [])
        } else {
          onChange(key, [v])
        }
        return
      }
      if (isNoneSelected) return // other options disabled when "none" is selected
      const next = selected.includes(v) ? raw.filter((x) => x !== v) : [...raw, v]
      onChange(key, next)
    }
    const setOtherText = (text: string) => {
      const i = raw.indexOf('other')
      if (i === -1) return
      const next = [...raw.slice(0, i + 1), text, ...raw.slice(i + 2)]
      onChange(key, next)
    }

    return (
      <div className="space-y-2">
        {options.map((opt) => {
          const isNoneOpt = noneOption?.value === opt.value
          const disabled = isNoneSelected && !isNoneOpt
          return (
            <label
              key={opt.value}
              className={`flex items-start gap-2 ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                disabled={disabled}
                className="mt-1 h-4 w-4 rounded border-slate-300 disabled:cursor-not-allowed"
              />
              <span className="text-slate-800">{opt.label}</span>
              {opt.hasTextInput && selected.includes(opt.value) && !disabled && (
                <input
                  type="text"
                  placeholder="Describe..."
                  className="ml-2 flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                />
              )}
            </label>
          )
        })}
      </div>
    )
  }

  if (question.inputType === 'single-select') {
    const current = value == null ? '' : String(value)
    return (
      <div className="space-y-2">
        {question.options?.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2">
            <input
              type="radio"
              name={key}
              checked={current === opt.value}
              onChange={() => onChange(key, opt.value)}
              className="h-4 w-4 border-slate-300"
            />
            <span className="text-slate-800">{opt.label}</span>
          </label>
        ))}
      </div>
    )
  }

  if (question.inputType === 'rating-scale') {
    const min = question.ratingMin ?? 1
    const max = question.ratingMax ?? 5
    const current = value != null ? Number(value) : undefined
    const minLabel = question.ratingLabels?.minLabel ?? ''
    const maxLabel = question.ratingLabels?.maxLabel ?? ''
    return (
      <div className="flex flex-wrap items-center gap-2">
        {minLabel && <span className="text-sm text-slate-600">{minLabel}</span>}
        <div className="flex gap-1">
          {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(key, n)}
              className={`h-10 w-10 rounded border text-sm font-medium transition-colors ${
                current === n
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        {maxLabel && <span className="text-sm text-slate-600">{maxLabel}</span>}
      </div>
    )
  }

  if (question.inputType === 'ranking') {
    const order = (Array.isArray(value) ? value : value ? [String(value)] : []) as string[]
    const options = question.options ?? []
    const initOrder = (order.length
      ? order.filter((x): x is string => typeof x === 'string')
      : options.map((o) => o.value)
    ) as string[]

    const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

    const reorder = (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return
      const next = [...initOrder]
      const [removed] = next.splice(fromIndex, 1)
      if (removed !== undefined) next.splice(toIndex, 0, removed)
      onChange(key, next)
    }

    const handleDragStart = (e: React.DragEvent, index: number) => {
      setDraggedIndex(index)
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(index))
      e.dataTransfer.setData('application/json', JSON.stringify({ index }))
    }

    const handleDragEnd = () => {
      setDraggedIndex(null)
      setDragOverIndex(null)
    }

    const handleDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDragOverIndex(index)
    }

    const handleDragLeave = () => {
      setDragOverIndex(null)
    }

    const handleDrop = (e: React.DragEvent, toIndex: number) => {
      e.preventDefault()
      const fromIndex = draggedIndex ?? parseInt(e.dataTransfer.getData('text/plain'), 10)
      if (Number.isNaN(fromIndex) || fromIndex === toIndex) {
        setDraggedIndex(null)
        setDragOverIndex(null)
        return
      }
      reorder(fromIndex, toIndex)
      setDraggedIndex(null)
      setDragOverIndex(null)
    }

    return (
      <div className="space-y-2">
        <p className="mb-2 text-sm text-slate-600">Drag and drop to reorder. Most important at the top.</p>
        {initOrder.map((v, i) => (
          <div
            key={v}
            draggable
            onDragStart={(e) => handleDragStart(e, i)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, i)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, i)}
            className={`flex cursor-grab active:cursor-grabbing items-center gap-2 rounded border px-3 py-2 transition-colors ${
              draggedIndex === i
                ? 'border-slate-400 bg-slate-100 opacity-70'
                : dragOverIndex === i
                  ? 'border-slate-400 border-dashed bg-slate-100'
                  : 'border-slate-200 bg-slate-50'
            }`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key !== ' ' && e.key !== 'Enter') return
              e.preventDefault()
              const dir = e.key === 'Enter' ? -1 : 1
              const toIndex = i + (e.shiftKey ? -dir : dir)
              if (toIndex >= 0 && toIndex < initOrder.length) reorder(i, toIndex)
            }}
            aria-label={`${getOptionLabel(question, v)}, position ${i + 1} of ${initOrder.length}. Drag to reorder or use arrow keys.`}
          >
            <span className="select-none text-slate-400" aria-hidden>⋮⋮</span>
            <span className="text-slate-500">{i + 1}.</span>
            <span className="flex-1 text-slate-800">{getOptionLabel(question, v)}</span>
          </div>
        ))}
      </div>
    )
  }

  if (question.inputType === 'text-input') {
    const current = value == null ? '' : String(value)
    return (
      <textarea
        value={current}
        onChange={(e) => onChange(key, e.target.value)}
        rows={3}
        className="w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
        placeholder="Your answer..."
      />
    )
  }

  if (question.inputType === 'pain-level-with-meta') {
    const meta = value && typeof value === 'object' && !Array.isArray(value)
      ? (value as { pain?: number; frequency?: string; owner?: string; whatMakesHard?: string; notApplicable?: boolean })
      : {}
    const notApplicable = meta.notApplicable === true
    const pain = meta.pain ?? 0
    const frequency = meta.frequency ?? ''
    const owner = meta.owner ?? ''
    const whatMakesHard = meta.whatMakesHard ?? ''

    return (
      <div className="space-y-4 rounded border border-slate-200 bg-slate-50 p-4">
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={notApplicable}
            onChange={(e) =>
              onChange(key, e.target.checked ? { notApplicable: true } : {})
            }
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm font-medium text-slate-700">
            I don&apos;t do this or I&apos;ve never done this
          </span>
        </label>

        {!notApplicable && (
          <>
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">Pain level (1–5)</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onChange(key, { ...meta, pain: n, notApplicable: false })}
                    className={`h-9 w-9 rounded border text-sm ${
                      pain === n ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white hover:bg-slate-100'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">Frequency</p>
              <div className="flex flex-wrap gap-2">
                {['Daily', 'Weekly', 'Monthly', 'Rarely'].map((f) => (
                  <label key={f} className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`${key}-freq`}
                      checked={frequency === f}
                      onChange={() => onChange(key, { ...meta, frequency: f })}
                      className="h-4 w-4"
                    />
                    <span className="text-slate-800">{f}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">Who usually owns this?</p>
              <div className="flex flex-wrap gap-2">
                {['Me', 'Developer', 'Agency', 'Other'].map((o) => (
                  <label key={o} className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`${key}-owner`}
                      checked={owner === o}
                      onChange={() => onChange(key, { ...meta, owner: o })}
                      className="h-4 w-4"
                    />
                    <span className="text-slate-800">{o}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">What makes this hard?</label>
              <textarea
                value={whatMakesHard}
                onChange={(e) => onChange(key, { ...meta, whatMakesHard: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
                placeholder="Optional..."
              />
            </div>
          </>
        )}
      </div>
    )
  }

  if (question.inputType === 'matrix') {
    const rowAnswers: Record<string, string> = (value && typeof value === 'object' && !Array.isArray(value) && !('pain' in (value as object)))
      ? (value as Record<string, string>)
      : {}
    const options = question.options ?? []
    const columns = question.columns ?? []
    const setCell = (rowValue: string, colValue: string) => {
      onChange(key, { ...rowAnswers, [rowValue]: colValue })
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-slate-200 bg-slate-100 p-2 text-left font-medium text-slate-800">Activity</th>
              {columns.map((col) => (
                <th key={col.value} className="border border-slate-200 bg-slate-100 p-2 text-center font-medium text-slate-800">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {options.map((opt) => (
              <tr key={opt.value}>
                <td className="border border-slate-200 p-2 text-slate-800">{opt.label}</td>
                {columns.map((col) => (
                  <td key={col.value} className="border border-slate-200 p-2 text-center">
                    <input
                      type="radio"
                      name={`${key}-${opt.value}`}
                      checked={(rowAnswers[opt.value] ?? '') === col.value}
                      onChange={() => setCell(opt.value, col.value)}
                      className="h-4 w-4"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return <p className="text-amber-700">Unknown input type: {question.inputType}</p>
}
