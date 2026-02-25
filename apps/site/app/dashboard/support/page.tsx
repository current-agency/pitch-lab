import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { ApplicationShell5 } from '@/components/application-shell5'
import { requireAuth } from '@/lib/auth'

const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'

export default async function SupportPage() {
  const cookieStore = await cookies()
  const { token } = requireAuth(cookieStore)

  const res = await fetch(`${CMS_URL}/api/users/me?depth=0`, {
    headers: { Authorization: `JWT ${token}` },
    next: { revalidate: 0 },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    redirect('/login')
  }

  const user = data.user as {
    firstName?: string | null
    lastName?: string | null
    email?: string | null
  }
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'User'
  const userEmail = user?.email ?? ''

  return (
    <ApplicationShell5
      user={{ name: userName, email: userEmail, avatar: '' }}
    >
      <div className="rounded-xl p-6">
        <h1 className="text-2xl font-bold text-slate-900">Find a Bug?</h1>
        <p className="mt-1 text-slate-600">
          Report a bug or issue. Submit the form below and we’ll look into it.
        </p>
        <div className="mt-8 max-w-lg">
          <p className="text-slate-600">
            Bug report form can be added here (e.g. subject, description, submit to support tickets).
          </p>
        </div>
      </div>
    </ApplicationShell5>
  )
}
