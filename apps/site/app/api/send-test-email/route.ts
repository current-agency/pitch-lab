import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/sendgrid'

/**
 * Test endpoint to send one email. For local/dev use only.
 * Set SENDGRID_FROM in .env to a verified SendGrid sender.
 *
 * One-line curl (no line breaks; replace the email):
 *   curl -X POST http://localhost:3000/api/send-test-email -H "Content-Type: application/json" -d '{"to":"you@example.com"}'
 */
export async function POST(request: Request) {
  let body: { to?: string } = {}
  try {
    const raw = await request.text()
    if (raw) body = JSON.parse(raw) as { to?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body. Send: {"to":"your@email.com"}' }, { status: 400 })
  }

  const to = typeof body?.to === 'string' ? body.to.trim() : ''
  if (!to) {
    return NextResponse.json({ error: 'Missing "to" in body. Example: {"to":"your@email.com"}' }, { status: 400 })
  }

  const from = process.env.SENDGRID_FROM || process.env.SENDGRID_FROM_EMAIL
  if (!from) {
    return NextResponse.json(
      { error: 'Set SENDGRID_FROM (or SENDGRID_FROM_EMAIL) in .env to a verified SendGrid sender' },
      { status: 500 },
    )
  }

  try {
    await sendEmail({
      to,
      from,
      subject: 'SendGrid test from Pitch Lab',
      text: 'If you see this, SendGrid is working.',
      html: '<p>If you see this, <strong>SendGrid is working.</strong></p>',
    })
    return NextResponse.json({ ok: true, message: 'Email sent' })
  } catch (err) {
    console.error('SendGrid test error:', err)
    const message = err instanceof Error ? err.message : 'Failed to send'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
