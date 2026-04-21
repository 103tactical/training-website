import { timingSafeEqual } from 'crypto'
import type { CollectionConfig, PayloadRequest } from 'payload'
import { Resend } from 'resend'
import { SquareClient, SquareEnvironment } from 'square'
import { sendEmail, type EmailAttachment } from '../lib/email'

function getResendClient(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  return new Resend(key)
}

function getFromAddress(): string {
  const name  = process.env.FROM_NAME  || '103 Tactical Training'
  const email = process.env.FROM_EMAIL || 'onboarding@resend.dev'
  return `${name} <${email}>`
}

// ── Access control (admin-only — no public or website access needed) ──────────

function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false
  try {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    if (bufA.length !== bufB.length) return false
    return timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function allowAccess({ req }: { req: any }): boolean {
  if (req?.user) return true
  const auth: string = req?.headers?.get?.('authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  const secret = process.env.CMS_WRITE_SECRET ?? ''
  return safeCompare(token, secret)
}

// ── Square client (same pattern as Bookings.ts) ────────────────────────────────

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

// ── Email template for Square payment-link emails ─────────────────────────────

function buildPaymentLinkEmail({
  firstName,
  courseName,
  sessionDateStr,
  paymentUrl,
  onboardingMessage,
}: {
  firstName: string
  courseName: string
  sessionDateStr: string
  paymentUrl: string
  onboardingMessage?: string
}): { html: string; text: string } {
  const brandName = process.env.FROM_NAME || '103 Tactical Training'

  const escapedUrl = paymentUrl.replace(/&/g, '&amp;')

  const onboardingBlock =
    onboardingMessage?.trim()
      ? `<tr><td style="padding:0 32px 24px;font-size:15px;line-height:1.6;color:#333333;border-top:1px solid #e8e8e8;">
          <p style="margin:0 0 8px;font-weight:600;color:#111;">Additional Information</p>
          <p style="margin:0;">${onboardingMessage.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>
         </td></tr>`
      : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>${brandName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;width:100%;background:#ffffff;border-radius:6px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#111111;padding:24px 32px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">${brandName}</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:32px 32px 20px;font-size:15px;line-height:1.6;color:#333333;">
              <p style="margin:0 0 12px;">Hi ${firstName},</p>
              <p style="margin:0 0 12px;">
                You have been registered for <strong>${courseName}</strong>${sessionDateStr ? ` on <strong>${sessionDateStr}</strong>` : ''}.
              </p>
              <p style="margin:0;">To secure your spot, please complete your payment using the button below:</p>
            </td>
          </tr>

          <!-- Button -->
          <tr>
            <td align="center" style="padding:8px 32px 28px;">
              <a href="${escapedUrl}"
                 style="display:inline-block;background:#ea580c;color:#ffffff;font-size:15px;font-weight:700;
                        text-decoration:none;padding:14px 32px;border-radius:5px;letter-spacing:0.3px;">
                Complete Payment
              </a>
              <p style="margin:12px 0 0;font-size:12px;color:#888888;">
                Or copy this link: <a href="${escapedUrl}" style="color:#ea580c;">${paymentUrl}</a>
              </p>
            </td>
          </tr>

          ${onboardingBlock}

          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9;padding:20px 32px;border-top:1px solid #e8e8e8;
                       font-size:12px;color:#888888;text-align:center;">
              <p style="margin:0;">${brandName}</p>
              <p style="margin:4px 0 0;">Questions? Reply to this email and we will get back to you.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    `Hi ${firstName},`,
    ``,
    `You have been registered for ${courseName}${sessionDateStr ? ` on ${sessionDateStr}` : ''}.`,
    ``,
    `To secure your spot, please complete your payment here:`,
    paymentUrl,
    ``,
    ...(onboardingMessage?.trim() ? [onboardingMessage, ``] : []),
    `Questions? Reply to this email.`,
  ].join('\n')

  return { html, text }
}

// ── Mark attendee paid endpoint ───────────────────────────────────────────────
// Called by the website's Square webhook after a payment is confirmed.
// Finds the private group booking by schedule ID and updates the matching
// attendee's paymentStatus to 'paid'. Non-fatal — booking already exists by
// the time this is called.

async function markAttendeePaidHandler(req: PayloadRequest): Promise<Response> {
  // Allow logged-in admin OR website backend presenting CMS_WRITE_SECRET
  if (!req.user) {
    const auth: string = req?.headers?.get?.('authorization') ?? ''
    const token = auth.replace(/^Bearer\s+/i, '').trim()
    const secret = process.env.CMS_WRITE_SECRET ?? ''
    if (!safeCompare(token, secret)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: { email?: string; scheduleId?: string | number }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body = (await (req as any).json()) as { email?: string; scheduleId?: string | number }
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { email, scheduleId } = body
  if (!email || !scheduleId) {
    return Response.json({ error: 'email and scheduleId are required' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = req.payload as any

  // Find the private group booking that owns this schedule
  const result = await p.find({
    collection: 'private-group-bookings',
    where: { createdScheduleId: { equals: Number(scheduleId) } },
    limit: 1,
    req,
  })

  if (result.docs.length === 0) {
    // Not a private group booking — no-op, this is expected for regular bookings
    return Response.json({ updated: false, reason: 'No matching private group booking' })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupBooking: Record<string, any> = result.docs[0]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attendees: any[] = groupBooking.attendees ?? []

  const normalizedEmail = String(email).toLowerCase().trim()
  let matched = false

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatedAttendees = attendees.map((a: any) => {
    if (String(a.email ?? '').toLowerCase().trim() === normalizedEmail) {
      matched = true
      return { ...a, paymentStatus: 'paid' }
    }
    return a
  })

  if (!matched) {
    return Response.json({ updated: false, reason: 'Attendee email not found in group booking' })
  }

  try {
    await p.update({
      collection: 'private-group-bookings',
      id: groupBooking.id,
      data: { attendees: updatedAttendees },
      req,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: `Failed to update attendee status: ${msg}` }, { status: 500 })
  }

  return Response.json({ updated: true })
}

// ── Process endpoint ──────────────────────────────────────────────────────────

const ALLOWED_ATTACH_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
])
const MAX_ATTACH_PER_FILE = 5  * 1024 * 1024  // 5 MB
const MAX_ATTACH_TOTAL    = 10 * 1024 * 1024  // 10 MB
const MAX_ATTACH_FILES    = 5

async function processHandler(req: PayloadRequest): Promise<Response> {
  if (!req.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = req.routeParams?.id
  if (!id) {
    return Response.json({ error: 'Missing id' }, { status: 400 })
  }

  // ── Parse optional file attachments from multipart form data ─────────────
  let attachments: EmailAttachment[] = []
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formData: FormData = await (req as any).formData()
    const rawFiles = formData.getAll('attachments').filter(
      (e): e is File => e instanceof File && e.size > 0,
    )

    if (rawFiles.length > MAX_ATTACH_FILES) {
      return Response.json(
        { error: `Maximum ${MAX_ATTACH_FILES} attachments allowed.` },
        { status: 400 },
      )
    }

    let totalSize = 0
    for (const file of rawFiles) {
      if (!ALLOWED_ATTACH_TYPES.has(file.type)) {
        return Response.json(
          { error: `"${file.name}" is not an allowed file type. PDF, JPG, Word (.doc/.docx), and TXT only.` },
          { status: 400 },
        )
      }
      if (file.size > MAX_ATTACH_PER_FILE) {
        return Response.json(
          { error: `"${file.name}" exceeds the 5 MB per-file limit.` },
          { status: 400 },
        )
      }
      totalSize += file.size
      if (totalSize > MAX_ATTACH_TOTAL) {
        return Response.json(
          { error: 'Total attachment size exceeds the 10 MB limit.' },
          { status: 400 },
        )
      }
      const buffer = Buffer.from(await file.arrayBuffer())
      attachments.push({ filename: file.name, content: buffer })
    }
  } catch {
    // No body or not multipart — proceed with no attachments
    attachments = []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = req.payload as any

  // ── Load the group booking (depth:2 to populate course object) ────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let groupBooking: Record<string, any>
  try {
    groupBooking = await p.findByID({
      collection: 'private-group-bookings',
      id,
      depth: 2,
      req,
    })
  } catch {
    return Response.json({ error: 'Group booking not found.' }, { status: 404 })
  }

  if (groupBooking.status === 'cancelled') {
    return Response.json({ error: 'Cannot process a cancelled booking.' }, { status: 400 })
  }

  const { attendees, paymentMethod, sessions, course, pricePerSeat, onboardingMessage, manualPaymentNote } =
    groupBooking

  // ── Validation ────────────────────────────────────────────────────────────
  if (!attendees?.length) {
    return Response.json({ error: 'Add at least one attendee before processing.' }, { status: 400 })
  }
  if (!paymentMethod) {
    return Response.json({ error: 'Select a payment method before processing.' }, { status: 400 })
  }
  if (!sessions?.length) {
    return Response.json({ error: 'Add at least one session date before processing.' }, { status: 400 })
  }

  const courseObj = typeof course === 'object' && course !== null ? course : null
  const courseId: number | null =
    typeof course === 'number' ? course : courseObj?.id ?? null

  if (!courseId) {
    return Response.json(
      { error: 'A course must be selected before processing. Create a course (with "Active" unchecked to keep it private) and link it here first.' },
      { status: 400 },
    )
  }

  const courseName: string = courseObj?.title ?? `Course #${courseId}`
  const priceInCents = Math.round((pricePerSeat ?? 0) * 100)

  const sessionDateStr = (sessions as { date?: string }[])
    .filter((s) => s.date)
    .map((s) => {
      try {
        return new Date(s.date!).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        })
      } catch {
        return s.date!
      }
    })
    .join(', ')

  // ── Step 1: Create or reuse CourseSchedule ────────────────────────────────
  let scheduleId: number = groupBooking.createdScheduleId
  let seatCountExpanded = false

  if (!scheduleId) {
    try {
      const newSchedule = await p.create({
        collection: 'course-schedules',
        data: {
          course: courseId,
          label: `Private: ${groupBooking.title}`,
          displayLabel: 'Private Group',
          maxSeats: attendees.length,
          seatsBooked: 0,
          isActive: false,
          sessions: sessions.map((s: { date?: string; startTime?: string; endTime?: string }) => ({
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        },
        req,
      })
      scheduleId = newSchedule.id as number

      // Persist the schedule ID so re-processing reuses it
      await p.update({
        collection: 'private-group-bookings',
        id,
        data: { createdScheduleId: scheduleId },
        req,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return Response.json({ error: `Failed to create course schedule: ${msg}` }, { status: 500 })
    }
  } else {
    // Schedule already exists from a previous run — ensure maxSeats reflects
    // the current attendee count in case the admin added people since the
    // schedule was first created.
    try {
      const existingSchedule = await p.findByID({
        collection: 'course-schedules',
        id: scheduleId,
        req,
      })
      if (existingSchedule && (existingSchedule.maxSeats ?? 0) < attendees.length) {
        await p.update({
          collection: 'course-schedules',
          id: scheduleId,
          data: { maxSeats: attendees.length },
          req,
        })
        seatCountExpanded = true
      }
    } catch {
      // Non-fatal — proceed; the overbooking guard will catch any real issues
    }
  }

  // ── Step 2: Square client check (payment-links mode only) ─────────────────
  if (paymentMethod === 'payment-links') {
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      return Response.json(
        { error: 'SQUARE_ACCESS_TOKEN is not configured on the CMS. Add it in Render → CMS service → Environment Variables.' },
        { status: 503 },
      )
    }
    if (!process.env.SQUARE_LOCATION_ID) {
      return Response.json(
        { error: 'SQUARE_LOCATION_ID is not configured on the CMS. Add it in Render → CMS service → Environment Variables.' },
        { status: 503 },
      )
    }
  }

  // ── Step 3: Process each attendee ─────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: Array<{ attendeeRowId: string; email: string; success: boolean; skipped?: boolean; error?: string; checkoutUrl?: string; bookingId?: number }> = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const attendee of attendees as any[]) {
    const attendeeRowId: string = attendee.id ?? attendee.email

    try {
      if (paymentMethod === 'manual') {
        // Skip attendees already confirmed
        if (attendee.paymentStatus === 'manual') {
          results.push({ attendeeRowId, email: attendee.email, success: true, skipped: true })
          continue
        }

        // Find or create Attendee record
        const existingResult = await p.find({
          collection: 'attendees',
          where: { email: { equals: attendee.email } },
          limit: 1,
          req,
        })

        let attendeeDbId: number
        if (existingResult.docs.length > 0) {
          attendeeDbId = existingResult.docs[0].id as number
          // Update name/phone if changed
          await p.update({
            collection: 'attendees',
            id: attendeeDbId,
            data: {
              firstName: attendee.firstName,
              lastName: attendee.lastName,
              ...(attendee.phone ? { phone: attendee.phone } : {}),
            },
            req,
          })
        } else {
          const newAttendee = await p.create({
            collection: 'attendees',
            data: {
              firstName: attendee.firstName,
              lastName: attendee.lastName,
              email: attendee.email,
              phone: attendee.phone || undefined,
            },
            req,
          })
          attendeeDbId = newAttendee.id as number
        }

        // Check for an existing booking for this attendee + schedule
        const existingBooking = await p.find({
          collection: 'bookings',
          where: {
            and: [
              { attendee: { equals: attendeeDbId } },
              { courseSchedule: { equals: scheduleId } },
            ],
          },
          limit: 1,
          req,
        })

        let bookingId: number
        if (existingBooking.docs.length > 0) {
          bookingId = existingBooking.docs[0].id as number
        } else {
          const payRef = manualPaymentNote?.trim()
            ? `Private group – ${manualPaymentNote.trim()}`
            : 'Private group – manual payment'

          const newBooking = await p.create({
            collection: 'bookings',
            data: {
              attendee: attendeeDbId,
              course: courseId,
              courseSchedule: scheduleId,
              status: 'confirmed',
              paymentReference: payRef,
            },
            req,
          })
          bookingId = newBooking.id as number
        }

        // Send confirmation email if an onboarding message is set (or attachments provided)
        if (onboardingMessage?.trim() || attachments.length > 0) {
          try {
            const from = process.env.FROM_NAME || '103 Tactical Training'
            await sendEmail({
              to: attendee.email,
              subject: `${courseName} — You're Confirmed`,
              message: [
                `Hi ${attendee.firstName},`,
                ``,
                `You have been confirmed for ${courseName}${sessionDateStr ? ` on ${sessionDateStr}` : ''}.`,
                ``,
                ...(onboardingMessage?.trim() ? [onboardingMessage.trim(), ``] : []),
                `Questions? Reply to this email.`,
                ``,
                `— ${from}`,
              ].join('\n'),
              attachments,
            })
          } catch (emailErr) {
            // Email failure is non-fatal — booking was already created
            console.error('[PrivateGroupBookings] Confirmation email failed:', emailErr)
          }
        }

        results.push({ attendeeRowId, email: attendee.email, success: true, bookingId })
      } else {
        // ── payment-links ──────────────────────────────────────────────────

        // Skip attendees already sent a link
        if (attendee.paymentStatus === 'link-sent' && attendee.paymentLink) {
          results.push({ attendeeRowId, email: attendee.email, success: true, skipped: true, checkoutUrl: attendee.paymentLink })
          continue
        }

        const squareClient = getSquareClient()!  // already validated above

        const token = crypto.randomUUID().replace(/-/g, '')

        // Create PendingBooking (webhook uses this to create Booking on payment)
        await p.create({
          collection: 'pending-bookings',
          data: {
            token,
            courseSchedule: scheduleId,
            email: attendee.email,
            firstName: attendee.firstName,
            lastName: attendee.lastName,
            phone: attendee.phone || undefined,
            status: 'pending',
          },
          req,
        })

        // Phone in E.164 for Square pre-population
        const phoneDigits = (attendee.phone ?? '').replace(/\D/g, '')
        const e164Phone =
          phoneDigits.length === 10
            ? `+1${phoneDigits}`
            : phoneDigits.length === 11 && phoneDigits.startsWith('1')
              ? `+${phoneDigits}`
              : undefined

        // Idempotency key scoped to this group booking + attendee row + token
        const idempotencyKey = `pgb-${id}-${attendeeRowId}-${token}`

        const squareResponse = await squareClient.checkout.paymentLinks.create({
          idempotencyKey,
          order: {
            locationId: process.env.SQUARE_LOCATION_ID!,
            // referenceId is used by the webhook to look up the PendingBooking
            referenceId: token,
            metadata: {
              pendingBookingToken: token,
              courseScheduleId: String(scheduleId),
              courseTitle: courseName,
              sessionDates: sessionDateStr,
              attendeeEmail: attendee.email,
              privateGroupBookingId: String(id),
            },
            lineItems: [
              {
                name: courseName,
                quantity: '1',
                note: sessionDateStr || undefined,
                basePriceMoney: {
                  amount: BigInt(priceInCents),
                  currency: 'USD',
                },
              },
            ],
          },
          checkoutOptions: {
            // No redirectUrl — Square shows its own hosted order confirmation page.
            // This intentionally avoids routing the attendee through the public website.
            ...(process.env.SQUARE_SUPPORT_EMAIL
              ? { merchantSupportEmail: process.env.SQUARE_SUPPORT_EMAIL }
              : {}),
          },
          prePopulatedData: {
            buyerEmail: attendee.email,
            ...(e164Phone ? { buyerPhoneNumber: e164Phone } : {}),
          },
        })

        const checkoutUrl = squareResponse.paymentLink?.url
        if (!checkoutUrl) {
          throw new Error('Square did not return a checkout URL.')
        }

        // Send email with payment link button (custom HTML template)
        const { html, text } = buildPaymentLinkEmail({
          firstName: attendee.firstName,
          courseName,
          sessionDateStr,
          paymentUrl: checkoutUrl,
          onboardingMessage: onboardingMessage?.trim() || undefined,
        })

        const resendClient = getResendClient()
        const { error: emailError } = await resendClient.emails.send({
          from: getFromAddress(),
          to: attendee.email,
          subject: `${courseName} — Complete Your Registration`,
          html,
          text,
          ...(attachments.length > 0 && { attachments }),
        })

        if (emailError) {
          // Payment link was created — store it even if email failed so it can be resent manually
          console.error(`[PrivateGroupBookings] Email send failed for ${attendee.email}:`, emailError)
          results.push({
            attendeeRowId,
            email: attendee.email,
            success: false,
            checkoutUrl,
            error: `Payment link created but email failed to send: ${emailError.message}. Link: ${checkoutUrl}`,
          })
          continue
        }

        results.push({ attendeeRowId, email: attendee.email, success: true, checkoutUrl })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[PrivateGroupBookings] processHandler error for ${attendee.email}:`, err)
      results.push({ attendeeRowId, email: attendee.email, success: false, error: message })
    }
  }

  // ── Step 4: Update attendee statuses + group booking status ──────────────
  const successCount = results.filter((r) => r.success && !r.skipped).length
  const failCount    = results.filter((r) => !r.success).length
  const skippedCount = results.filter((r) => r.skipped).length

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatedAttendees = (attendees as any[]).map((a: any) => {
    const r = results.find((res) => res.attendeeRowId === (a.id ?? a.email))
    if (!r || r.skipped || !r.success) return a
    if (paymentMethod === 'manual') {
      return { ...a, paymentStatus: 'manual', bookingId: r.bookingId ?? a.bookingId }
    }
    return { ...a, paymentStatus: 'link-sent', paymentLink: r.checkoutUrl ?? a.paymentLink }
  })

  // Mark status as sent/completed if at least some succeeded; keep draft only if all failed
  const anySuccess = successCount > 0 || skippedCount > 0
  const newStatus = anySuccess
    ? paymentMethod === 'manual'
      ? 'completed'
      : 'sent'
    : groupBooking.status

  try {
    await p.update({
      collection: 'private-group-bookings',
      id,
      data: {
        status: newStatus,
        attendees: updatedAttendees,
      },
      req,
    })
  } catch (updateErr) {
    console.error('[PrivateGroupBookings] Failed to update status/attendees after processing:', updateErr)
    // Non-fatal — return the processing result anyway
  }

  return Response.json({
    success: failCount === 0,
    processed: successCount,
    skipped: skippedCount,
    failed: failCount,
    seatCountExpanded,
    results,
  })
}

// ── Collection definition ─────────────────────────────────────────────────────

export const PrivateGroupBookings: CollectionConfig = {
  slug: 'private-group-bookings',
  labels: {
    singular: 'Private Group Booking',
    plural: 'Private Group Bookings',
  },
  admin: {
    useAsTitle: 'title',
    group: 'Course Management',
    defaultColumns: ['title', 'status', 'paymentMethod', 'updatedAt'],
    description:
      'Manage private course bookings for groups. Set up the course, add attendees, then either send each person a Square payment link or confirm them as manually paid.',
  },
  disableDuplicate: true,
  access: {
    read: allowAccess,
    create: ({ req }) => Boolean(req?.user),
    update: allowAccess,
    delete: ({ req }) => Boolean(req?.user),
  },
  endpoints: [
    {
      path: '/:id/process',
      method: 'post',
      handler: processHandler,
    },
    {
      path: '/mark-attendee-paid',
      method: 'post',
      handler: markAttendeePaidHandler,
    },
  ],
  fields: [
    // ── Status (read-only — managed by the process endpoint) ─────────────────
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Updated automatically when the booking is processed.',
      },
      options: [
        { label: 'Draft',     value: 'draft' },
        { label: 'Sent',      value: 'sent' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },

    // ── Title ─────────────────────────────────────────────────────────────────
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Group Name / Title',
      admin: {
        description: 'e.g. "Smith Family — Jun 5" or "ABC Corp Team Training"',
      },
    },

    // ── 1. Course & Schedule ──────────────────────────────────────────────────
    {
      type: 'collapsible',
      label: 'Course & Schedule',
      admin: { initCollapsed: false },
      fields: [
        {
          name: 'course',
          type: 'relationship',
          relationTo: 'courses',
          required: true,
          label: 'Course',
          admin: {
            description:
              'Select the course for this group. To keep it private, create or open the course and uncheck "Active (show on site)" — it will be hidden from the public but still usable here.',
          },
        },
        {
          name: 'pricePerSeat',
          type: 'number',
          required: true,
          label: 'Price Per Seat ($)',
          min: 0,
          admin: {
            description:
              'Amount each attendee will be charged. Defaults to the course price — override here to set a custom group rate.',
          },
        },
        {
          name: 'sessions',
          type: 'array',
          label: 'Session Dates',
          minRows: 1,
          labels: {
            singular: 'Day',
            plural: 'Days',
          },
          admin: {
            description: 'Add one entry for each day the group meets.',
          },
          fields: [
            {
              name: 'date',
              type: 'date',
              required: true,
              label: 'Date',
              admin: {
                date: {
                  pickerAppearance: 'dayOnly',
                  displayFormat: 'MMM d, yyyy',
                },
              },
            },
            {
              name: 'startTime',
              type: 'date',
              label: 'Start Time',
              admin: {
                date: {
                  pickerAppearance: 'timeOnly',
                  displayFormat: 'h:mm aa',
                },
              },
            },
            {
              name: 'endTime',
              type: 'date',
              label: 'End Time',
              admin: {
                date: {
                  pickerAppearance: 'timeOnly',
                  displayFormat: 'h:mm aa',
                },
              },
            },
          ],
        },
        {
          name: 'internalNotes',
          type: 'textarea',
          label: 'Internal Notes',
          admin: {
            description:
              'Admin-only notes — location, special instructions, payment terms, etc. Not sent to attendees.',
          },
        },
      ],
    },

    // ── 2. Attendees ──────────────────────────────────────────────────────────
    {
      type: 'collapsible',
      label: 'Attendees',
      admin: { initCollapsed: false },
      fields: [
        {
          name: 'attendees',
          type: 'array',
          label: false,
          labels: {
            singular: 'Attendee',
            plural: 'Attendees',
          },
          admin: {
            description:
              'Add each person who will attend. First name, last name, and email are required. After processing, the Payment Status and Payment Link columns will update automatically.',
          },
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'firstName', type: 'text', required: true, label: 'First Name' },
                { name: 'lastName',  type: 'text', required: true, label: 'Last Name' },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'email', type: 'email', required: true, label: 'Email' },
                { name: 'phone', type: 'text',  label: 'Phone (optional)' },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'paymentStatus',
                  type: 'select',
                  defaultValue: 'pending',
                  label: 'Payment Status',
                  admin: {
                    readOnly: true,
                    description: 'Set automatically on processing.',
                  },
                  options: [
                    { label: 'Pending',    value: 'pending' },
                    { label: 'Link Sent',  value: 'link-sent' },
                    { label: 'Paid',       value: 'paid' },
                    { label: 'Manual',     value: 'manual' },
                    { label: 'Cancelled',  value: 'cancelled' },
                  ],
                },
                {
                  name: 'bookingId',
                  type: 'number',
                  label: 'Booking ID',
                  admin: {
                    readOnly: true,
                    description: 'Filled in after manual confirmation.',
                  },
                },
              ],
            },
            {
              name: 'paymentLink',
              type: 'text',
              label: 'Payment Link',
              admin: {
                readOnly: true,
                description: 'Filled in after payment links are sent.',
              },
            },
          ],
        },
      ],
    },

    // ── 3. Onboarding Message ─────────────────────────────────────────────────
    {
      type: 'collapsible',
      label: 'Onboarding Message (Optional)',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'onboardingMessage',
          type: 'textarea',
          label: 'Message',
          admin: {
            description:
              'Optional text included in every email sent to attendees — useful for parking instructions, what to bring, dress code, etc. Leave blank to send the email without additional content.',
          },
        },
      ],
    },

    // ── 4. Payment Direction ──────────────────────────────────────────────────
    {
      type: 'collapsible',
      label: 'Payment Direction',
      admin: { initCollapsed: false },
      fields: [
        {
          name: 'paymentMethod',
          type: 'select',
          required: true,
          label: 'How will payment be collected?',
          options: [
            {
              label: 'Send Square payment link to each attendee',
              value: 'payment-links',
            },
            {
              label: 'Manual — I will collect payment directly (cash, invoice, etc.)',
              value: 'manual',
            },
          ],
          admin: {
            description:
              '"Payment links" emails each attendee a unique Square checkout link. ' +
              '"Manual" immediately confirms all attendees as booked — use when you have already collected or arranged payment separately.',
          },
        },
        {
          name: 'manualPaymentNote',
          type: 'text',
          label: 'Payment Reference / Method Note',
          admin: {
            description:
              'Optional — recorded on each booking as a reference (e.g. "Cash", "Invoice #123", "Square Virtual Terminal").',
            condition: (data) => data.paymentMethod === 'manual',
          },
        },
      ],
    },

    // ── Action button ─────────────────────────────────────────────────────────
    {
      name: 'processAction',
      type: 'ui',
      admin: {
        components: {
          Field: './components/ProcessGroupBookingButton',
        },
      },
    },

    // ── Internal tracking (not shown in UI) ───────────────────────────────────
    {
      name: 'createdScheduleId',
      type: 'number',
      admin: {
        hidden: true,
        description: 'ID of the CourseSchedule created when this group booking was first processed.',
      },
    },
  ],
}
