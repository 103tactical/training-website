import { timingSafeEqual } from 'crypto'
import type { CollectionConfig, PayloadRequest } from 'payload'
import { sendBulkEmail } from '../lib/email'

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

    return Response.json({ success: true })
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
      'Short-lived checkout sessions created when a visitor starts the booking flow. ' +
      'Completed once payment is confirmed. ' +
      'Expired records are visitors who started checkout but did not pay — useful as a prospecting list.',
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
      label: 'First Name',
    },
    {
      name: 'lastName',
      type: 'text',
      label: 'Last Name',
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Phone Number',
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
      label: 'Amount Paid (cents)',
      admin: {
        readOnly: true,
        description: 'e.g. 22500 = $225.00',
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
