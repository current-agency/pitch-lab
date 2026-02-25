'use client'

import { useState } from 'react'

const IDEA_A = 'Idea A'
const IDEA_B = 'Idea B'

export default function SliderPage() {
  const [value, setValue] = useState(50) // 0 = Idea A, 100 = Idea B

  const handleSubmit = () => {
    const closenessToA = 100 - value
    const closenessToB = value
    console.log({ value, closenessToA, closenessToB })
    // Persist response: POST to Payload or API (e.g. slider responses collection). See docs/feature-user-dashboard.md.
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Slider</h1>
        <p className="mb-6 text-slate-600">
          Move the slider between two ideas. Position is recorded (how close to each idea).
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex justify-between text-sm font-medium text-slate-700">
            <span>{IDEA_A}</span>
            <span>{IDEA_B}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-full h-3 rounded-full appearance-none bg-slate-200 accent-slate-800"
          />
          <p className="mt-4 text-center text-slate-500">
            Position: {value}% toward {IDEA_B} ({(100 - value)}% toward {IDEA_A})
          </p>
          <button
            onClick={handleSubmit}
            className="mt-6 w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}
