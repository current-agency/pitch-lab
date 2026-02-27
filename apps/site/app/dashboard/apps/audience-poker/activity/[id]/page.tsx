import { cookies } from 'next/headers'
import { requireAuth } from '@/lib/auth'
import { AudiencePokerActivityClient } from './AudiencePokerActivityClient'

export default async function AudiencePokerActivityPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const cookieStore = await cookies()
  requireAuth(cookieStore)

  return (
    <div className="min-h-screen bg-stone-100 p-6">
      <AudiencePokerActivityClient params={params} />
    </div>
  )
}
