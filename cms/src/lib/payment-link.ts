/**
 * Send a tracked Square payment link for a specific course session.
 *
 * Used by the CourseSchedules "/:id/send-payment-link" endpoint. Mirrors the
 * public website's checkout exactly:
 *   - price = course price + card surcharge (pass-through formula from the
 *     E-Commerce global) — identical to what a website customer pays
 *   - a tokenized PendingBooking is created first, so the payment webhook
 *     resolves the payer into an Attendee + confirmed Booking automatically
 *   - redirect back to the site's booking-confirmation page after payment
 *
 * The email reuses the branded payment-link template style used by
 * Private Group Bookings.
 */
import { SquareClient, SquareEnvironment } from 'square'
import type { PayloadRequest } from 'payload'
import { questionsLine } from './email'

function getSquareClient(): SquareClient | null {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN
  if (!accessToken) return null
  return new SquareClient({
    token: accessToken,
    environment:
      process.env.SQUARE_ENVIRONMENT === 'sandbox'
        ? SquareEnvironment.Sandbox
        : SquareEnvironment.Production,
  })
}

function getFromAddress(): string {
  const name = process.env.FROM_NAME || '103 Tactical Training'
  const email = process.env.FROM_EMAIL || 'onboarding@resend.dev'
  return `${name} <${email}>`
}

export interface SendPaymentLinkArgs {
  req: PayloadRequest
  scheduleId: number
  firstName: string
  lastName: string
  email: string
  phone?: string
}

export interface SendPaymentLinkResult {
  checkoutUrl: string
  totalCents: number
  surchargeCents: number
  emailSent: boolean
  emailError?: string
}

export async function sendPaymentLink(args: SendPaymentLinkArgs): Promise<SendPaymentLinkResult> {
  const { req, scheduleId, firstName, lastName, email, phone } = args
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = req.payload as any

  const squareClient = getSquareClient()
  if (!squareClient) throw new Error('SQUARE_ACCESS_TOKEN is not configured on the CMS.')
  if (!process.env.SQUARE_LOCATION_ID) throw new Error('SQUARE_LOCATION_ID is not configured on the CMS.')

  // ── Load schedule + course ────────────────────────────────────────────────
  const schedule = await p.findByID({ collection: 'course-schedules', id: scheduleId, depth: 1, req })
  if (!schedule) throw new Error('Session not found.')
  const course = typeof schedule.course === 'object' && schedule.course !== null ? schedule.course : null
  if (!course) throw new Error('Session has no linked course.')

  // ── Guard: session must still be bookable ────────────────────────────────
  const firstSession = (schedule.sessions ?? [])[0]
  if (firstSession?.date) {
    const day = String(firstSession.date).slice(0, 10)
    const nowDay = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/New_York',
    }).format(new Date())
    if (day < nowDay) throw new Error('This session has already taken place.')
  }
  const remaining = (schedule.maxSeats ?? 0) - (schedule.seatsBooked ?? 0)
  if (remaining <= 0) {
    throw new Error(
      `This session is full (${schedule.seatsBooked}/${schedule.maxSeats}). ` +
      `A link would collect payment with no seat available.`,
    )
  }

  // ── Price: identical math to the website booking page ────────────────────
  const priceInCents = Math.round((course.price ?? 0) * 100)
  if (priceInCents <= 0) throw new Error('Course has no price set.')

  const ecom = await p.findGlobal({ slug: 'e-commerce' })
  const surchargePercent: number = ecom?.payments?.creditCardSurchargePercent ?? 0
  const fixedFeeCents: number = ecom?.payments?.creditCardFixedFeeCents ?? 0
  const surchargeCents = surchargePercent > 0
    ? Math.round((priceInCents + fixedFeeCents) / (1 - surchargePercent / 100)) - priceInCents
    : 0

  // ── PendingBooking with token (webhook claim ticket) ─────────────────────
  const token = crypto.randomUUID().replace(/-/g, '')
  await p.create({
    collection: 'pending-bookings',
    data: {
      token,
      courseSchedule: scheduleId,
      email,
      firstName,
      lastName,
      phone: phone || undefined,
      status: 'pending',
    },
    req,
  })

  // ── Session date string for the email + Square line item ─────────────────
  const sessionDateStr = ((schedule.sessions ?? []) as { date?: string }[])
    .filter((s) => s.date)
    .map((s) => {
      try {
        return new Date(s.date!).toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
        })
      } catch { return s.date! }
    })
    .join(', ')

  // ── Square payment link (same shape as the website checkout) ─────────────
  const phoneDigits = (phone ?? '').replace(/\D/g, '')
  const e164Phone =
    phoneDigits.length === 10 ? `+1${phoneDigits}` :
    phoneDigits.length === 11 && phoneDigits.startsWith('1') ? `+${phoneDigits}` :
    undefined

  const siteUrl = process.env.NEXT_PUBLIC_WEB_URL ?? ''

  const response = await squareClient.checkout.paymentLinks.create({
    idempotencyKey: `admlink-${scheduleId}-${token}`,
    order: {
      locationId: process.env.SQUARE_LOCATION_ID,
      source: { name: '103 Tactical — Admin Payment Link' },
      referenceId: token,
      metadata: {
        pendingBookingToken: token,
        courseScheduleId: String(scheduleId),
        courseTitle: course.title ?? '',
        sessionDates: sessionDateStr,
        attendeeEmail: email,
      },
      lineItems: [
        {
          name: course.title ?? 'Course Registration',
          quantity: '1',
          note: [schedule.displayLabel ?? schedule.label ?? null, sessionDateStr || null].filter(Boolean).join(' — ') || undefined,
          basePriceMoney: { amount: BigInt(priceInCents), currency: 'USD' },
        },
      ],
      ...(surchargeCents > 0 ? {
        serviceCharges: [
          {
            name: `Credit Card Processing Fee (${surchargePercent}%)`,
            amountMoney: { amount: BigInt(surchargeCents), currency: 'USD' },
            calculationPhase: 'SUBTOTAL_PHASE' as const,
            taxable: false,
          },
        ],
      } : {}),
    },
    checkoutOptions: {
      ...(siteUrl ? { redirectUrl: `${siteUrl}/booking-confirmation` } : {}),
      ...(process.env.SQUARE_SUPPORT_EMAIL ? { merchantSupportEmail: process.env.SQUARE_SUPPORT_EMAIL } : {}),
    },
    prePopulatedData: {
      buyerEmail: email,
      ...(e164Phone ? { buyerPhoneNumber: e164Phone } : {}),
    },
  })

  const checkoutUrl = response.paymentLink?.url
  if (!checkoutUrl) throw new Error('Square did not return a checkout URL.')

  const totalCents = priceInCents + surchargeCents

  // ── Branded email with the payment button ────────────────────────────────
  const brandName = process.env.FROM_NAME || '103 Tactical Training'
  const questions = await questionsLine(p)
  const escapedUrl = checkoutUrl.replace(/&/g, '&amp;')
  const totalStr = `$${(totalCents / 100).toFixed(2)}`

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /><title>${brandName}</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:6px;overflow:hidden;">
        <tr><td style="background:#111111;padding:24px 32px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">${brandName}</p>
        </td></tr>
        <tr><td style="padding:32px 32px 20px;font-size:15px;line-height:1.6;color:#333333;">
          <p style="margin:0 0 12px;">Hi ${firstName},</p>
          <p style="margin:0 0 12px;">You have been registered for <strong>${course.title}</strong>${sessionDateStr ? ` on <strong>${sessionDateStr}</strong>` : ''}.</p>
          <p style="margin:0;">To secure your seat, please complete your payment of <strong>${totalStr}</strong> using the button below:</p>
        </td></tr>
        <tr><td align="center" style="padding:8px 32px 28px;">
          <a href="${escapedUrl}" style="display:inline-block;background:#ea580c;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:5px;letter-spacing:0.3px;">Complete Payment</a>
          <p style="margin:12px 0 0;font-size:12px;color:#888888;">Or copy this link: <a href="${escapedUrl}" style="color:#ea580c;">${checkoutUrl}</a></p>
        </td></tr>
        <tr><td style="background:#f9f9f9;padding:20px 32px;border-top:1px solid #e8e8e8;font-size:12px;color:#888888;text-align:center;">
          <p style="margin:0;">${brandName}</p>
          <p style="margin:4px 0 0;">${questions}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const text = [
    `Hi ${firstName},`,
    ``,
    `You have been registered for ${course.title}${sessionDateStr ? ` on ${sessionDateStr}` : ''}.`,
    ``,
    `To secure your seat, please complete your payment of ${totalStr} here:`,
    checkoutUrl,
    ``,
    questions,
  ].join('\n')

  // Send via the raw Resend API (same as lib/email.ts — captures quota headers)
  let emailSent = false
  let emailError: string | undefined
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    emailError = 'RESEND_API_KEY is not set — link created but email not sent.'
  } else {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: getFromAddress(),
          to: email,
          subject: `${course.title} — Complete Your Registration`,
          html,
          text,
        }),
      })
      // Persist quota headers like lib/email.ts does
      const daily = res.headers.get('x-resend-daily-quota')
      const monthly = res.headers.get('x-resend-monthly-quota')
      if (daily !== null || monthly !== null) {
        const { saveQuota } = await import('./resend-quota-cache')
        saveQuota(
          daily !== null ? parseInt(daily, 10) : null,
          monthly !== null ? parseInt(monthly, 10) : null,
        ).catch(() => {})
      }
      if (res.ok) {
        emailSent = true
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const j: any = await res.json().catch(() => ({}))
        emailError = j?.message ?? `Resend HTTP ${res.status}`
      }
    } catch (err) {
      emailError = err instanceof Error ? err.message : String(err)
    }
  }

  return { checkoutUrl, totalCents, surchargeCents, emailSent, emailError }
}
