import { BugReportFab } from '@/components/bug-report-fab'

export default function DashboardAppsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <BugReportFab />
    </>
  )
}
