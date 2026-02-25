/**
 * Validates required env vars. Call at app startup or at the start of API routes
 * that depend on them. Throws with a clear message if missing.
 */
export function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(
      `${name} is required for the survey app. Set it in .env or your deployment environment (e.g. Vercel). See apps/survey/.env.example.`
    )
  }
  return value
}
