import { DashboardBackBanner } from '@/components/dashboard-back-banner'
import { BugReportFab } from '@/components/bug-report-fab'

export default function DashboardAppsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <DashboardBackBanner />
      {children}
      <BugReportFab />
    </>
  )
}
