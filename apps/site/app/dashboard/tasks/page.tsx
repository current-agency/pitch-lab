import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { ApplicationShell5 } from '@/components/application-shell5'
import { requireAuth } from '@/lib/auth'

import { getCmsUrl } from '@repo/env'

export default async function TasksPage() {
  const cookieStore = await cookies()
  const { token } = requireAuth(cookieStore)

  const res = await fetch(`${getCmsUrl()}/api/users/me?depth=0`, {
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
        <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
        <p className="mt-2 text-slate-600">Tasks and assignments will appear here.</p>
      </div>
    </ApplicationShell5>
  )
}
