import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Survey',
  description: 'Complete questions and see tabulated results',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
