import { cookies } from 'next/headers'
import { requireAuth } from '@/lib/auth'
import ContentRankClient from './ContentRankClient'

export default async function ContentRankPage() {
  requireAuth(await cookies())
  return <ContentRankClient />
}
