import { cookies } from 'next/headers'
import { requireAuth } from '@/lib/auth'
import SurveyClient from './SurveyClient'

export default async function SurveyPage() {
  await requireAuth(await cookies())
  return <SurveyClient />
}
