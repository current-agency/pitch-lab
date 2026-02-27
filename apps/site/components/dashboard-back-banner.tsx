import Link from 'next/link'

export function DashboardBackBanner() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="flex h-12 items-center px-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm font-medium text-slate-700 hover:text-slate-900"
        >
          ← Back to dashboard
        </Link>
      </div>
    </header>
  )
}
