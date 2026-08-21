import { timingSafeEqual } from 'crypto'
import type { CollectionConfig, PayloadRequest } from 'payload'
import { sendBulkEmail, sendEmail, questionsLine, type EmailAttachment } from '../lib/email'
import { optionalPhoneValidate, phoneBeforeValidate } from '../lib/phone'
import { dismissNotificationsLinkingTo } from '../lib/dismiss-notifications'

// ── Access control (same pattern as Attendees / Bookings) ─────────────────────

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

// ── Email expired leads endpoint ──────────────────────────────────────────────

async function emailExpiredHandler(req: PayloadRequest): Promise<Response> {
  if (!req.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { subject?: string; message?: string }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body = (await (req as any).json()) as { subject?: string; message?: string }
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { subject, message } = body
  if (!subject?.trim() || !message?.trim()) {
    return Response.json({ error: 'subject and message are required' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = req.payload as any

  const result = await p.find({
    collection: 'pending-bookings',
    where: { status: { equals: 'expired' } },
    limit: 1000,
    req,
  })

  if (result.totalDocs === 0) {
    return Response.json({ sent: 0, failed: 0, errors: [], note: 'No expired leads found.' })
  }

  const emails: string[] = result.docs.map((doc: { email: string }) => doc.email).filter(Boolean)

  try {
    const sendResult = await sendBulkEmail({ recipients: emails, subject: subject.trim(), message: message.trim() })
    return Response.json(sendResult)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: msg }, { status: 500 })
  }
}

// ── Retry endpoint handler ────────────────────────────────────────────────────

async function retryHandler(req: PayloadRequest): Promise<Response> {
  if (!req.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = req.routeParams?.id
  if (!id) {
    return Response.json({ error: 'Missing id' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = req.payload as any

  let pending: Record<string, unknown>
  try {
    pending = await p.findByID({ collection: 'pending-bookings', id, req })
  } catch {
    return Response.json({ error: 'Pending booking not found' }, { status: 404 })
  }

  if (pending.status !== 'failed') {
    return Response.json(
      { error: `Cannot retry — current status is "${pending.status}". Only "failed" records can be retried.` },
      { status: 400 },
    )
  }

  const squareOrderId = pending.squareOrderId as string | undefined
  if (!squareOrderId) {
    return Response.json(
      { error: 'No Square Order ID stored — payment may not have completed. Cannot retry.' },
      { status: 400 },
    )
  }

  try {
    // ── 1. Resolve the CourseSchedule ───────────────────────────────────────
    const scheduleRaw = pending.courseSchedule
    const scheduleId =
      typeof scheduleRaw === 'object' && scheduleRaw !== null
        ? (scheduleRaw as { id: number }).id
        : scheduleRaw

    const schedule = await p.findByID({
      collection: 'course-schedules',
      id: scheduleId,
      depth: 1,
      req,
    })
    if (!schedule) {
      return Response.json({ error: 'Course schedule not found' }, { status: 400 })
    }

    const course = schedule.course
    const courseId =
      typeof course === 'object' && course !== null
        ? (course as { id: number }).id
        : course
    if (!courseId) {
      return Response.json({ error: 'Schedule has no linked course' }, { status: 400 })
    }

    // ── 2. Find or create Attendee ──────────────────────────────────────────
    const email = pending.email as string
    const existingResult = await p.find({
      collection: 'attendees',
      where: { email: { equals: email } },
      limit: 1,
      req,
    })

    let attendeeId: number
    if (existingResult.docs.length > 0) {
      attendeeId = existingResult.docs[0].id as number
    } else {
      const newAttendee = await p.create({
        collection: 'attendees',
        data: {
          firstName: pending.firstName as string,
          lastName: pending.lastName as string,
          email,
          phone: (pending.phone as string | undefined) ?? undefined,
        },
        req,
      })
      attendeeId = newAttendee.id as number
    }

    // ── 3. Create Booking ──────────────────────────────────────────────────
    await p.create({
      collection: 'bookings',
      data: {
        attendee: attendeeId,
        course: courseId,
        courseSchedule: scheduleId,
        status: 'confirmed',
        squareOrderId,
        squarePaymentId: (pending.squarePaymentId as string | undefined) ?? undefined,
        amountPaidCents: (pending.amountPaidCents as number | undefined) ?? undefined,
        paymentReference: squareOrderId,
      },
      req,
    })

    // ── 4. Mark pending booking as completed ────────────────────────────────
    await p.update({
      collection: 'pending-bookings',
      id,
      data: {
        status: 'completed',
        failureReason: null,
      },
      req,
    })

    // ── 5. Send the attendee the same emails the webhook would have ─────────
    // Non-fatal: the booking and money trail are already correct above; a
    // failed email must not make the retry look failed.
    const emails: Record<string, string> = {}
    try {
      const course = await p.findByID({ collection: 'courses', id: courseId, depth: 1, req })
      const firstName = (pending.firstName as string | undefined) ?? 'there'
      const q = await questionsLine(p)

      const sessionDates = ((schedule.sessions ?? []) as { date?: string }[])
        .map((s) =>
          s.date
            ? new Date(s.date).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                // session dates are day-only values pinned to noon UTC —
                // format in UTC so the day can never shift
                timeZone: 'UTC',
              })
            : null,
        )
        .filter(Boolean)
        .join(' & ')

      const amountCents = pending.amountPaidCents as number | undefined
      const amountLine =
        typeof amountCents === 'number' ? `\nAmount Paid: $${(amountCents / 100).toFixed(2)}` : ''

      try {
        await sendEmail({
          to: email,
          subject: `Booking Confirmed — ${course.title}`,
          message:
            `Hi ${firstName},\n\n` +
            `Your booking is confirmed!\n\n` +
            `Course: ${course.title}` +
            (sessionDates ? `\nDate(s): ${sessionDates}` : '') +
            amountLine +
            `\nOrder ID: ${squareOrderId}\n\n` +
            `We look forward to seeing you. ${q}`,
        })
        emails.confirmation = 'sent'
      } catch (e) {
        emails.confirmation = `failed: ${e instanceof Error ? e.message : String(e)}`
      }

      // Enrollment email — same gate as the webhook: message OR document.
      if (course?.enrollmentMessage || course?.enrollmentFile) {
        try {
          const attachments: EmailAttachment[] = []
          const fileDoc = course.enrollmentFile as
            | { url?: string; filename?: string }
            | undefined
          if (fileDoc?.url) {
            const base = process.env.NEXT_PUBLIC_SERVER_URL ?? ''
            const fileUrl = fileDoc.url.startsWith('http') ? fileDoc.url : `${base}${fileDoc.url}`
            const fileRes = await fetch(fileUrl)
            if (!fileRes.ok) throw new Error(`Could not fetch enrollment file (${fileRes.status})`)
            attachments.push({
              filename:
                fileDoc.filename ?? `${String(course.title).replace(/[^a-z0-9]/gi, '-')}-Enrollment-Form`,
              content: Buffer.from(await fileRes.arrayBuffer()),
            })
          }
          await sendEmail({
            to: email,
            subject: `Your Enrollment Forms — ${course.title}`,
            message:
              `Hi ${firstName},\n\n` +
              `Thank you for enrolling in ${course.title}. Please review the following information before your course date.\n\n` +
              `${(course.enrollmentMessage as string | undefined) ?? ''}` +
              (attachments.length > 0
                ? `\n\nAn enrollment document is attached. Please review it before your first day of class. If it includes a form, please complete it and bring it with you.`
                : '') +
              `\n\n${q}`,
            attachments,
          })
          emails.enrollment = 'sent'
        } catch (e) {
          emails.enrollment = `failed: ${e instanceof Error ? e.message : String(e)}`
        }
      } else {
        emails.enrollment = 'skipped — course has no enrollment message or document'
      }
    } catch (e) {
      emails.error = e instanceof Error ? e.message : String(e)
    }

    return Response.json({ success: true, emails })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    // Update failure reason so admin can see what went wrong
    try {
      await p.update({
        collection: 'pending-bookings',
        id,
        data: { failureReason: message, attemptedAt: new Date().toISOString() },
        req,
      })
    } catch {
      // ignore secondary failure
    }

    return Response.json({ error: message }, { status: 500 })
  }
}

// ── Resend payment link endpoint ──────────────────────────────────────────────
// Re-emails the EXISTING Square link (never creates a new link, record, or
// seat hold) and stamps linkSentAt so lists show the latest send.

async function resendLinkHandler(req: PayloadRequest): Promise<Response> {
  if (!req.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const id = req.routeParams?.id
  if (!id) {
    return Response.json({ error: 'Missing id' }, { status: 400 })
  }
  try {
    const { resendPaymentLink } = await import('../lib/payment-link')
    const result = await resendPaymentLink({ req, pendingId: id as string })
    return Response.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: msg }, { status: 400 })
  }
}

// ── Cancel payment link endpoint ──────────────────────────────────────────────
// One-click "Cancel & Release Seat" for an outstanding admin-sent link:
//   1. disables the payment link AT SQUARE (when we have its ID) so the
//      emailed URL stops working — nobody can pay a cancelled link;
//   2. deletes the pending record, which releases the held seat instantly.
// Sends no email to the customer. Deleting the record is safe even if the
// Square call fails: a payment on a recordless link lands as a flagged
// "failed record" with an admin alert, never lost money.

async function cancelLinkHandler(req: PayloadRequest): Promise<Response> {
  if (!req.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const id = req.routeParams?.id
  if (!id) {
    return Response.json({ error: 'Missing id' }, { status: 400 })
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = req.payload as any
  const pending = await p.findByID({ collection: 'pending-bookings', id, req }).catch(() => null)
  if (!pending) {
    return Response.json({ error: 'Record not found — it may already be cancelled.' }, { status: 404 })
  }
  if (pending.status !== 'pending') {
    return Response.json(
      { error: `This record is ${pending.status}, not awaiting payment — nothing to cancel.` },
      { status: 400 },
    )
  }

  const linkId = pending.squarePaymentLinkId as string | undefined
  let linkDisabled = false
  let linkDisableError: string | null = null
  if (linkId) {
    try {
      const { getSquareClient } = await import('../lib/payment-link')
      const square = getSquareClient()
      if (square) {
        await square.checkout.paymentLinks.delete({ id: linkId })
        linkDisabled = true
      } else {
        linkDisableError = 'Square is not configured on the CMS.'
      }
    } catch (err) {
      // A 404 from Square means the link is already gone — that's the goal.
      const msg = err instanceof Error ? err.message : String(err)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((err as any)?.statusCode === 404 || msg.includes('404')) {
        linkDisabled = true
      } else {
        console.error('[cancel-link] Square delete failed:', err)
        linkDisableError = msg
      }
    }
  }

  try {
    await p.delete({ collection: 'pending-bookings', id, req })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // The link may already be dead at Square but the seat is still held —
    // surface that clearly rather than pretending the whole cancel worked.
    return Response.json(
      { error: `Could not remove the record (seat still held): ${msg}`, linkDisabled },
      { status: 500 },
    )
  }

  return Response.json({ ok: true, linkDisabled, hadLinkId: Boolean(linkId), linkDisableError })
}

// ── Collection definition ─────────────────────────────────────────────────────

export const PendingBookings: CollectionConfig = {
  slug: 'pending-bookings',
  labels: {
    singular: 'Pending Booking',
    plural: 'Pending Bookings',
  },
  admin: {
    useAsTitle: 'email',
    group: 'Course Management',
    defaultColumns: ['email', 'courseSchedule', 'status', 'failureReason', 'updatedAt'],
    description:
      'Checkout sessions created when a visitor starts the booking flow. ' +
      'All records are kept for auditing and accounting purposes — ' +
      'Completed = booking created successfully · ' +
      'Failed = payment received but booking creation failed (use Retry) · ' +
      'Expired = visitor started checkout but never paid (useful as a prospecting list) · ' +
      'Completed records remain here intentionally as a permanent audit trail linking Square Order IDs to bookings.',
    components: {
      beforeList: ['./components/EmailExpiredLeadsButton'],
    },
  },
  disableDuplicate: true,
  access: {
    read:   allowAccess,
    create: allowAccess,
    update: allowAccess,
    delete: ({ req }) => Boolean(req?.user), // only logged-in admins can delete
  },
  hooks: {
    // Deleting a pending record (releasing a hold, clearing a failed row)
    // dismisses any failed-booking notification that deep-links to it, so
    // the Notifications page never shows a broken "Open the failed record"
    // button. Covers both raw list deletes and the Cancel & Release Seat
    // endpoint (it deletes via the local API, so this hook runs there too).
    afterDelete: [
      async ({ id, req }) => {
        await dismissNotificationsLinkingTo(
          req.payload,
          `/admin/collections/pending-bookings/${id}`,
        )
      },
    ],
  },
  endpoints: [
    {
      path: '/email-expired',
      method: 'post',
      handler: emailExpiredHandler,
    },
    {
      path: '/:id/retry',
      method: 'post',
      handler: retryHandler,
    },
    {
      path: '/:id/resend-link',
      method: 'post',
      handler: resendLinkHandler,
    },
    {
      path: '/:id/cancel-link',
      method: 'post',
      handler: cancelLinkHandler,
    },
  ],
  fields: [
    // ── Retry action button (shown on failed records only) ─────────────────
    {
      name: 'retryAction',
      type: 'ui',
      admin: {
        components: {
          Field: './components/RetryBookingButton',
        },
      },
    },

    // ── Core form data ──────────────────────────────────────────────────────
    {
      name: 'token',
      type: 'text',
      required: true,
      admin: {
        readOnly: true,
        description: 'Unique lookup key embedded in the Square Order referenceId.',
      },
    },
    {
      name: 'courseSchedule',
      type: 'relationship',
      relationTo: 'course-schedules',
      required: true,
      label: 'Session',
      admin: {
        description: 'The session the visitor was trying to book.',
      },
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      label: 'Email Address',
    },
    {
      name: 'firstName',
      type: 'text',
      maxLength: 100,
      label: 'First Name',
    },
    {
      name: 'lastName',
      type: 'text',
      maxLength: 100,
      label: 'Last Name',
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Phone Number',
      validate: optionalPhoneValidate,
      hooks: { beforeValidate: [phoneBeforeValidate] },
    },
    {
      name: 'source',
      type: 'select',
      label: 'Source',
      options: [
        { label: 'Website checkout', value: 'website' },
        { label: 'Admin payment link', value: 'admin-link' },
      ],
      admin: {
        readOnly: true,
        description:
          'Admin payment links HOLD a seat on the website while unpaid — deleting this record releases the seat. ' +
          'Website checkouts hold nothing.',
      },
    },
    {
      name: 'checkoutUrl',
      type: 'text',
      label: 'Payment Link URL',
      admin: {
        readOnly: true,
        description: 'The Square checkout link that was sent. Copy it to resend to the customer.',
        condition: (data) => Boolean(data?.checkoutUrl),
      },
    },
    {
      name: 'squarePaymentLinkId',
      type: 'text',
      label: 'Square Payment Link ID',
      admin: {
        readOnly: true,
        description:
          'Square’s internal ID for the payment link — lets "Cancel & Release Seat" disable the link at Square so it can no longer be paid.',
        condition: (data) => Boolean(data?.squarePaymentLinkId),
      },
    },
    {
      name: 'linkSentAt',
      type: 'date',
      label: 'Link Last Sent',
      admin: {
        readOnly: true,
        description: 'When the payment-link email was last sent (initial send or resend).',
        condition: (data) => Boolean(data?.linkSentAt),
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'MMM d, yyyy  h:mm aa',
        },
      },
    },
    {
      name: 'linkTotalCents',
      type: 'number',
      label: 'Link Total',
      admin: {
        readOnly: true,
        description: 'The total the Square link charges — captured when the link was created.',
        condition: (data) => Boolean(data?.linkTotalCents),
        components: {
          Field: './components/DollarsField',
        },
      },
    },

    // ── Discount (set when a code was applied at checkout) ──────────────────
    {
      name: 'discountCode',
      type: 'text',
      label: 'Discount Code',
      admin: {
        readOnly: true,
        description: 'Code applied when this checkout was created.',
        condition: (data) => Boolean(data?.discountCode),
      },
    },
    {
      name: 'discountCents',
      type: 'number',
      label: 'Discount Amount',
      admin: {
        readOnly: true,
        description: 'Amount taken off the course price by the code.',
        condition: (data) => Boolean(data?.discountCode),
        components: {
          Field: './components/DollarsField',
        },
      },
    },

    // ── Status ──────────────────────────────────────────────────────────────
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      label: 'Status',
      options: [
        { label: 'Pending',   value: 'pending' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed',    value: 'failed' },
        { label: 'Expired',   value: 'expired' },
      ],
      admin: {
        description:
          'Pending: awaiting payment · Completed: booking created · ' +
          'Failed: webhook fired but booking creation failed (use Retry) · ' +
          'Expired: visitor never paid (>24h old)',
        components: {
          Cell: './components/PendingStatusBadge',
        },
      },
    },

    // ── Square data (populated by webhook) ──────────────────────────────────
    {
      name: 'squareOrderId',
      type: 'text',
      label: 'Square Order ID',
      admin: {
        readOnly: true,
        description: 'Set when Square confirms payment. Required for retry.',
      },
    },
    {
      name: 'squarePaymentId',
      type: 'text',
      label: 'Square Payment ID',
      admin: {
        readOnly: true,
        description: 'Set when Square confirms payment.',
      },
    },
    {
      name: 'amountPaidCents',
      type: 'number',
      label: 'Amount Paid',
      admin: {
        readOnly: true,
        description: 'Set when Square confirms payment.',
        components: {
          Field: './components/DollarsField',
        },
      },
    },

    // ── Failure tracking ─────────────────────────────────────────────────────
    {
      name: 'failureReason',
      type: 'textarea',
      label: 'Failure Reason',
      admin: {
        readOnly: true,
        description: 'Populated when status is Failed. Shows the error that prevented booking creation.',
        condition: (data) => data.status === 'failed',
        rows: 10,
        components: {
          Cell: './components/FailureReasonCell',
        },
      },
    },
    {
      name: 'attemptedAt',
      type: 'date',
      label: 'Last Attempt',
      admin: {
        readOnly: true,
        description: 'When the webhook last attempted to process this record.',
        condition: (data) => Boolean(data.attemptedAt),
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'MMM d, yyyy  h:mm aa',
        },
      },
    },
  ],
}
