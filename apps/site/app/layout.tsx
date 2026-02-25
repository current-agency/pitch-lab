import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Site | Landing & Dashboard',
  description: 'Marketing site, login, and user dashboard',
  icons: { icon: '/logo.svg' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
