'use client'

import Link from 'next/link'
import { Button, Input, Label, cn } from '@repo/ui'

interface Login3Props {
  heading?: string
  error?: string | null
  disabled?: boolean
  logo?: {
    url: string
    src: string
    alt: string
    title?: string
    className?: string
  }
  buttonText?: string
  signupText?: string
  signupUrl?: string
  className?: string
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
}

const defaultLogo = {
  url: 'https://www.shadcnblocks.com',
  src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/shadcnblocks-logo.svg',
  alt: 'logo',
  title: 'shadcnblocks.com',
}

const Login3 = ({
  heading = 'Login',
  error,
  disabled = false,
  logo = defaultLogo,
  buttonText = 'Login',
  signupText = 'Need an account?',
  signupUrl = '/signup',
  className,
  onSubmit,
}: Login3Props) => {
  return (
    <section className={cn('h-screen bg-stone-100', className)}>
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-6 lg:justify-start">
          <form
            onSubmit={onSubmit}
            className="flex w-full max-w-sm min-w-sm flex-col items-center gap-y-4 px-6 py-12"
          >
            {/* Logo */}
            <Link href={logo.url}>
              <img
                src={logo.src}
                alt={logo.alt}
                title={logo.title}
                className="h-10 dark:invert"
              />
            </Link>
            {heading && <h1 className="text-2xl font-semibold">{heading}</h1>}
            {error && (
              <p className="w-full rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
            <div className="flex w-full flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Email"
                className="text-sm"
                required
              />
            </div>
            <div className="flex w-full flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                className="text-sm"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={disabled}>
              {buttonText}
            </Button>
          </form>
          <div className="flex justify-center gap-1 text-sm text-slate-500">
            <p>{signupText}</p>
            <Link
              href={signupUrl}
              className="font-medium text-slate-900 hover:underline"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export { Login3 }
