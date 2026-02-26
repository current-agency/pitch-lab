import { Bug } from 'lucide-react'

const BUG_FORM_URL = 'https://airtable.com/appOUfpkStrYE4D9k/pagouI9I6OnrTOjpR/form'

export function BugReportFab() {
  return (
    <a
      href={BUG_FORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-white shadow-lg transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
      aria-label="Report a bug"
    >
      <Bug className="h-6 w-6" />
    </a>
  )
}
