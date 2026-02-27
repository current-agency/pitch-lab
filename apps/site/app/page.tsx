import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-100">
      <main className="max-w-4xl mx-auto px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">
          Welcome
        </h1>
        <p className="text-lg text-slate-600 mb-10">
          Marketing landing page. Sign in or create an account to access the dashboard and tools.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow hover:bg-slate-800 transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </main>
    </div>
  )
}
