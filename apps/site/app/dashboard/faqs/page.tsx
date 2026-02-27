import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { ChevronRight } from 'lucide-react'
import { ApplicationShell5 } from '@/components/application-shell5'
import { requireAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import { getCmsUrl } from '@repo/env'

type FaqItem = {
  id: string
  question: string
  answer: string
  order?: number | null
}

export default async function FAQsPage() {
  const cookieStore = await cookies()
  const { token } = requireAuth(cookieStore)

  const base = getCmsUrl()
  const [userRes, faqsRes] = await Promise.all([
    fetch(`${base}/api/users/me?depth=0`, {
      headers: { Authorization: `JWT ${token}` },
      next: { revalidate: 0 },
    }),
    fetch(`${base}/api/faqs?sort=order&limit=100`, { next: { revalidate: 60 } }),
  ])

  const userData = await userRes.json().catch(() => ({}))
  if (!userRes.ok) {
    redirect('/login')
  }

  const user = userData.user as {
    firstName?: string | null
    lastName?: string | null
    email?: string | null
  }
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'User'
  const userEmail = user?.email ?? ''

  const faqsPayload = await faqsRes.json().catch(() => ({}))
  const faqs = (faqsPayload.docs ?? []) as FaqItem[]

  return (
    <ApplicationShell5
      user={{ name: userName, email: userEmail, avatar: '' }}
    >
      <section className={cn('py-8', 'rounded-xl p-6')}>
        <div>
          <Badge className="text-xs font-medium">FAQ</Badge>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900">
            Common Questions & Answers
          </h1>
          <p className="mt-6 font-medium text-muted-foreground">
            Find out all the essential details about our platform and how it can
            serve your needs.
          </p>
        </div>
        <div className="mt-12">
          <Accordion type="single" collapsible>
            {faqs.map((faq, index) => (
              <AccordionItem
                key={faq.id}
                value={`item-${faq.id}`}
                className="border-b-0"
              >
                <AccordionTrigger className="hover:text-foreground/60 hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        <Separator className="my-12" />
        <div className="flex flex-col justify-between gap-12 md:flex-row md:items-end">
          <div className="lg:col-span-2">
            <h2 className="mt-4 text-2xl font-semibold text-slate-900">
              Still have questions?
            </h2>
            <p className="mt-6 font-medium text-muted-foreground">
              We&apos;re here to provide clarity and assist with any queries you
              may have.
            </p>
          </div>
          <div className="flex md:justify-end">
            <Link
              href="/dashboard/support"
              className="flex items-center gap-2 hover:underline"
            >
              Contact Support
              <ChevronRight className="h-auto w-4" />
            </Link>
          </div>
        </div>
      </section>
    </ApplicationShell5>
  )
}
