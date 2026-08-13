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
import { validateDiscountCode } from './discount'

export function getSquareClient(): SquareClient | null {
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
  /** Optional discount code — validated with the same rules as the website */
  discountCode?: string
}

export interface SendPaymentLinkResult {
  checkoutUrl: string
  totalCents: number
  surchargeCents: number
  discountCents: number
  discountCode?: string
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
  // Availability counts outstanding admin links as held seats — Bernie can't
  // promise more seats than physically exist.
  const heldResult = await p.find({
    collection: 'pending-bookings',
    where: {
      and: [
        { courseSchedule: { equals: scheduleId } },
        { status: { equals: 'pending' } },
        { source: { equals: 'admin-link' } },
      ],
    },
    limit: 1,
    depth: 0,
    req,
  })
  const heldSeats: number = heldResult.totalDocs ?? 0
  const remaining = (schedule.maxSeats ?? 0) - (schedule.seatsBooked ?? 0) - heldSeats
  if (remaining <= 0) {
    throw new Error(
      heldSeats > 0
        ? `No seats left to promise: ${schedule.seatsBooked}/${schedule.maxSeats} booked plus ${heldSeats} outstanding payment link${heldSeats === 1 ? '' : 's'} already holding the rest. ` +
          `Wait for a link to be paid, delete an unpaid link (Pending Bookings), or raise Total Seats.`
        : `This session is full (${schedule.seatsBooked}/${schedule.maxSeats}). ` +
          `A link would collect payment with no seat available.`,
    )
  }

  // ── Price: identical math to the website booking page ────────────────────
  const priceInCents = Math.round((course.price ?? 0) * 100)
  if (priceInCents <= 0) throw new Error('Course has no price set.')

  // Optional discount code — same rules as the website checkout. The discount
  // comes off the course price; the surcharge is computed on the lower amount.
  let discountCents = 0
  let appliedCode: string | undefined
  if (args.discountCode?.trim()) {
    const check = await validateDiscountCode({
      payload: p,
      req,
      code: args.discountCode,
      courseId: Number(course.id),
      priceInCents,
    })
    if (!check.valid) throw new Error(`Discount code: ${check.reason}`)
    discountCents = check.discountCents
    appliedCode = check.code
  }
  const discountedPriceCents = priceInCents - discountCents

  const ecom = await p.findGlobal({ slug: 'e-commerce' })
  const surchargePercent: number = ecom?.payments?.creditCardSurchargePercent ?? 0
  const fixedFeeCents: number = ecom?.payments?.creditCardFixedFeeCents ?? 0
  const surchargeCents = surchargePercent > 0
    ? Math.round((discountedPriceCents + fixedFeeCents) / (1 - surchargePercent / 100)) - discountedPriceCents
    : 0

  // ── PendingBooking with token (webhook claim ticket) ─────────────────────
  const token = crypto.randomUUID().replace(/-/g, '')
  const pendingDoc = await p.create({
    collection: 'pending-bookings',
    data: {
      token,
      courseSchedule: scheduleId,
      email,
      firstName,
      lastName,
      phone: phone || undefined,
      status: 'pending',
      source: 'admin-link',
      ...(appliedCode ? { discountCode: appliedCode, discountCents } : {}),
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
      ...(discountCents > 0 && appliedCode ? {
        discounts: [
          {
            name: `Discount (${appliedCode})`,
            type: 'FIXED_AMOUNT' as const,
            amountMoney: { amount: BigInt(discountCents), currency: 'USD' },
            scope: 'ORDER' as const,
          },
        ],
      } : {}),
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
      // Discounts are CMS-managed — a Square-side coupon field would bypass
      // validation, redemption counts, and revenue reporting.
      enableCoupon: false,
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

  const totalCents = discountedPriceCents + surchargeCents

  // Store link + send metadata on the pending record: the URL for re-copying,
  // the send time shown in the awaiting-payment list, the link's REAL total
  // so resent emails quote the amount the link actually charges even if the
  // course price changes later, and Square's payment-link ID so the
  // cancel-link endpoint can disable the link at Square. Non-fatal.
  try {
    await p.update({
      collection: 'pending-bookings',
      id: pendingDoc.id,
      data: {
        checkoutUrl,
        linkSentAt: new Date().toISOString(),
        linkTotalCents: totalCents,
        squarePaymentLinkId: response.paymentLink?.id ?? null,
      },
      req,
    })
  } catch (err) {
    console.error('[payment-link] could not store link metadata:', err)
  }

  const { emailSent, emailError } = await sendLinkEmail(p, {
    to: email,
    firstName,
    courseTitle: course.title ?? 'your course',
    sessionDateStr,
    totalCents,
    discountCents,
    discountCode: appliedCode,
    checkoutUrl,
  })

  return { checkoutUrl, totalCents, surchargeCents, discountCents, discountCode: appliedCode, emailSent, emailError }
}

// ── Shared branded payment-link email ─────────────────────────────────────────
// Used by the initial send above AND by resends — one template, one place.

interface LinkEmailArgs {
  to: string
  firstName: string
  courseTitle: string
  sessionDateStr: string
  totalCents: number
  discountCents?: number
  discountCode?: string
  checkoutUrl: string
}

export async function sendLinkEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  p: any,
  args: LinkEmailArgs,
): Promise<{ emailSent: boolean; emailError?: string }> {
  const { to, firstName, courseTitle, sessionDateStr, totalCents, discountCents = 0, discountCode, checkoutUrl } = args

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
        <tr><td align="center" style="background:#111111;padding:20px 32px;">
          <img src="https://103tactical.com/email-logo.png" alt="103 Tactical" width="220" height="53" style="display:block;margin:0 auto;max-width:220px;height:auto;border:0;color:#ffffff;font-size:20px;font-weight:700;" />
        </td></tr>
        <tr><td style="padding:32px 32px 20px;font-size:15px;line-height:1.6;color:#333333;">
          <p style="margin:0 0 12px;">Hi ${firstName},</p>
          <p style="margin:0 0 12px;">You have been registered for <strong>${courseTitle}</strong>${sessionDateStr ? ` on <strong>${sessionDateStr}</strong>` : ''}.</p>${discountCode ? `
          <p style="margin:0 0 12px;">A discount of <strong>$${(discountCents / 100).toFixed(2)}</strong> (code ${discountCode}) has been applied to your registration.</p>` : ''}
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
    `You have been registered for ${courseTitle}${sessionDateStr ? ` on ${sessionDateStr}` : ''}.`,
    ...(discountCode ? [``, `A discount of $${(discountCents / 100).toFixed(2)} (code ${discountCode}) has been applied to your registration.`] : []),
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
    emailError = 'RESEND_API_KEY is not set — email not sent.'
  } else {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: getFromAddress(),
          to,
          subject: `${courseTitle} — Complete Your Registration`,
          html,
          text,
        }),
      })
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

  return { emailSent, emailError }
}

// ── Resend an EXISTING payment link (never creates a new one) ─────────────────

export async function resendPaymentLink(args: {
  req: PayloadRequest
  pendingId: number | string
}): Promise<{ emailSent: boolean; emailError?: string; to: string }> {
  const { req, pendingId } = args
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = req.payload as any

  const pending = await p.findByID({ collection: 'pending-bookings', id: pendingId, depth: 0, req })
  if (!pending) throw new Error('Pending booking not found.')
  if (pending.status !== 'pending') {
    throw new Error(`Cannot resend — this record is "${pending.status}", not awaiting payment.`)
  }
  if (pending.source !== 'admin-link') {
    throw new Error('Only admin-sent payment links can be resent.')
  }
  if (!pending.checkoutUrl) {
    throw new Error('No payment link is stored on this record (sent before link storage existed). Send a new link instead.')
  }

  const scheduleId =
    typeof pending.courseSchedule === 'object' && pending.courseSchedule !== null
      ? pending.courseSchedule.id
      : pending.courseSchedule
  const schedule = await p.findByID({ collection: 'course-schedules', id: scheduleId, depth: 1, req })
  const course = typeof schedule?.course === 'object' && schedule.course !== null ? schedule.course : null
  if (!course) throw new Error('Linked course not found.')

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

  // Prefer the total captured at link creation (the amount the link actually
  // charges). Legacy records without it fall back to recomputing.
  let totalCents: number
  if (typeof pending.linkTotalCents === 'number' && pending.linkTotalCents > 0) {
    totalCents = Math.round(pending.linkTotalCents)
  } else {
    const priceInCents = Math.round((course.price ?? 0) * 100)
    const discount = typeof pending.discountCents === 'number' ? pending.discountCents : 0
    const discounted = priceInCents - discount
    const ecom = await p.findGlobal({ slug: 'e-commerce' })
    const pct: number = ecom?.payments?.creditCardSurchargePercent ?? 0
    const fixed: number = ecom?.payments?.creditCardFixedFeeCents ?? 0
    const surcharge = pct > 0 ? Math.round((discounted + fixed) / (1 - pct / 100)) - discounted : 0
    totalCents = discounted + surcharge
  }

  const result = await sendLinkEmail(p, {
    to: pending.email,
    firstName: pending.firstName ?? 'there',
    courseTitle: course.title ?? 'your course',
    sessionDateStr,
    totalCents,
    discountCents: typeof pending.discountCents === 'number' ? pending.discountCents : 0,
    discountCode: pending.discountCode ?? undefined,
    checkoutUrl: pending.checkoutUrl,
  })

  if (result.emailSent) {
    await p
      .update({ collection: 'pending-bookings', id: pending.id, data: { linkSentAt: new Date().toISOString() }, req })
      .catch(() => {})
  }

  return { ...result, to: pending.email }
}
