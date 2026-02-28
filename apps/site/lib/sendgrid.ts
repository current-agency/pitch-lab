/**
 * SendGrid mail helper. Use only in server code (API routes, Server Actions).
 * Set SENDGRID_API_KEY in .env.
 *
 * Usage from an API route:
 *   import { sendEmail } from '@/lib/sendgrid'
 *   await sendEmail({
 *     to: 'user@example.com',
 *     from: 'noreply@yourdomain.com', // must be a verified sender in SendGrid
 *     subject: 'Subject',
 *     text: 'Plain text body',
 *     html: '<strong>HTML body</strong>',
 *   })
 */
import sgMail from '@sendgrid/mail'

const apiKey = process.env.SENDGRID_API_KEY
if (apiKey) {
  sgMail.setApiKey(apiKey)
}
// Optional: use EU data residency
// sgMail.setDataResidency('eu')

export type SendGridMessage = {
  to: string
  from: string
  subject: string
  text?: string
  html?: string
}

export async function sendEmail(msg: SendGridMessage): Promise<void> {
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY is not set')
  }
  await sgMail.send(msg)
}
