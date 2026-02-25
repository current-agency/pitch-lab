import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'Survey',
  description: 'Complete questions and see tabulated results',
}

const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? ''

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {dashboardUrl ? (
          <div className="border-b border-slate-200 bg-white px-4 py-2">
            <Link
              href={dashboardUrl}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              ← Back to PitchLab dashboard
            </Link>
          </div>
        ) : null}
        {children}
      </body>
    </html>
  )
}
