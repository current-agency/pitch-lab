'use client'

import { useState } from 'react'
import { Button } from '@repo/ui'

const BLANKS = [
  { id: 'blank1', label: 'First blank' },
  { id: 'blank2', label: 'Second blank' },
  { id: 'blank3', label: 'Third blank' },
]

export default function FillBlankPage() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const setValue = (id: string, value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Fill-in-the-blank:', values)
    setSubmitted(true)
    // Persist answers: POST to Payload or API (e.g. fill-blank responses collection). See docs/feature-user-dashboard.md.
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900">Done</h2>
          <p className="mt-2 text-slate-600">Your answers have been saved.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Fill in the blank</h1>
        <p className="mb-6 text-slate-600">
          Complete each text box below.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          {BLANKS.map(({ id, label }) => (
            <div key={id}>
              <label htmlFor={id} className="block text-sm font-medium text-slate-700">
                {label}
              </label>
              <input
                id={id}
                type="text"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                value={values[id] ?? ''}
                onChange={(e) => setValue(id, e.target.value)}
              />
            </div>
          ))}
          <Button type="submit">Submit</Button>
        </form>
      </div>
    </div>
  )
}
