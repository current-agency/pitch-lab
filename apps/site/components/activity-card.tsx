'use client'

import Link from 'next/link'
import { cn } from '@repo/ui'

export interface ActivityCardProps {
  /** e.g. "To do", "Completed" */
  status?: string
  /** Main heading */
  title: string
  /** Short description, can wrap to multiple lines */
  description?: string
  /** e.g. "IMAGE CHOICE", "CONTENT RANK" */
  categoryTag?: string
  /** Link target when card is clicked */
  href: string
  className?: string
}

const cardClassName =
  'flex w-full max-w-[365px] flex-col items-start gap-9 rounded-[1rem] bg-white p-[1.5rem] shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

export function ActivityCard({
  status,
  title,
  description,
  categoryTag,
  href,
  className,
}: ActivityCardProps) {
  return (
    <Link href={href} className={cn(cardClassName, className)}>
      {status ? (
        <span
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-white',
            status === 'Completed' ? 'bg-black' : 'bg-[#2563eb]',
          )}
        >
          {status}
        </span>
      ) : null}

      <h2 className="text-2xl font-semibold leading-tight text-[#000000]">
        {title}
      </h2>

      {description ? (
        <p className="text-base font-normal leading-relaxed text-[#4A4A4A]">
          {description}
        </p>
      ) : null}

      {categoryTag ? (
        <span className="text-xs font-medium uppercase tracking-wide text-[#000000]">
          {categoryTag}
        </span>
      ) : null}
    </Link>
  )
}
