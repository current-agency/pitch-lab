import { cookies } from 'next/headers'
import { requireAuth } from '@/lib/auth'
import { ImageChoiceClient } from './ImageChoiceClient'

export default async function ImageChoiceAppPage() {
  const cookieStore = await cookies()
  requireAuth(cookieStore)

  return (
    <div className="min-h-screen bg-stone-100 p-6">
      <ImageChoiceClient />
    </div>
  )
}
