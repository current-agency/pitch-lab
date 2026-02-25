import Link from 'next/link'

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Create an account</h1>
        <p className="text-slate-600">
          Account creation is by invitation. Contact your administrator to get access.
        </p>
        <Link
          href="/login"
          className="inline-block font-medium text-slate-900 underline hover:no-underline"
        >
          Back to login
        </Link>
      </div>
    </div>
  )
}
