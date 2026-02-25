'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@repo/ui'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

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
  /** When true, open href in a sheet overlay instead of navigating away */
  openInOverlay?: boolean
  className?: string
}

const cardClassName =
  'flex w-full max-w-[365px] flex-col items-start gap-12 rounded-[24px] bg-white p-6 shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

export function ActivityCard({
  status,
  title,
  description,
  categoryTag,
  href,
  openInOverlay = false,
  className,
}: ActivityCardProps) {
  const [overlayOpen, setOverlayOpen] = useState(false)

  useEffect(() => {
    if (!overlayOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOverlayOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [overlayOpen])

  const content = (
    <>
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
    </>
  )

  if (openInOverlay) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOverlayOpen(true)}
          className={cn(cardClassName, 'cursor-pointer text-left', className)}
        >
          {content}
        </button>
        <Sheet open={overlayOpen} onOpenChange={setOverlayOpen}>
          <SheetContent
            side="right"
            closeLabel="Close"
            className="flex h-full w-full max-w-[100vw] flex-col border-0 bg-white p-0 sm:max-w-2xl md:max-w-4xl"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>{title}</SheetTitle>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-hidden">
              <iframe
                title={title}
                src={href}
                className="h-full w-full border-0"
              />
            </div>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return <Link href={href} className={cn(cardClassName, className)}>{content}</Link>
}
