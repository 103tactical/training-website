import { APIError } from 'payload'
import type {
  CollectionConfig,
  CollectionAfterChangeHook,
  CollectionBeforeDeleteHook,
  CollectionBeforeChangeHook,
} from 'payload'
import { SquareClient, SquareEnvironment } from 'square'
import { sendEmail, questionsLine } from '../lib/email'

function getSquareClient() {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN
  if (!accessToken) return null
  return new SquareClient({
    token: accessToken,
    environment: process.env.SQUARE_ENVIRONMENT === 'sandbox'
      ? SquareEnvironment.Sandbox
      : SquareEnvironment.Production,
  })
}

/**
 * Issue a full refund via Square when an admin cancels a booking
 * that was originally paid through Square checkout.
 */
async function issueSquareRefund(paymentId: string, amountCents: number): Promise<void> {
  const client = getSquareClient()
  if (!client) {
    console.warn('[Bookings] SQUARE_ACCESS_TOKEN not set — skipping refund')
    return
  }
  try {
    const idempotencyKey = `refund-${paymentId}-${Date.now()}`
    await client.refunds.refundPayment({
      paymentId,
      idempotencyKey,
      amountMoney: {
        amount: BigInt(amountCents),
        currency: 'USD',
      },
      reason: 'Cancelled by admin via 103 Tactical CMS',
    })
    console.log(`[Bookings] Refund issued for payment ${paymentId}`)
  } catch (err) {
    // Log but do not throw — seat adjustment still runs even if refund fails
    console.error('[Bookings] Square refund error:', err)
  }
}

/** Statuses that count against a schedule's seat inventory */
const ACTIVE_STATUSES = ['confirmed', 'waitlisted']

/** Format session date strings for use in emails */
function formatSessionDates(sessions: { date?: string }[]): string {
  if (!sessions?.length) return ''
  const fmt = new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
  return sessions
    .filter((s) => s.date)
    .map((s) => { try { return fmt.format(new Date(s.date!)) } catch { return s.date! } })
    .join(', ')
}

/**
 * Format sessions as one line each with date AND time range (ET), for the
 * transfer notification where the attendee needs their full new schedule.
 * e.g. "Thu, Aug 14, 2026 — 8:00 AM to 4:00 PM"
 */
function formatSessionDateTimeLines(
  sessions: { date?: string; startTime?: string; endTime?: string }[],
): string[] {
  if (!sessions?.length) return []
  const dateFmt = new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
  const timeFmt = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York',
  })
  return sessions
    .filter((s) => s.date)
    .map((s) => {
      let line: string
      try { line = dateFmt.format(new Date(s.date!)) } catch { return s.date! }
      const start = s.startTime ? (() => { try { return timeFmt.format(new Date(s.startTime!)) } catch { return '' } })() : ''
      const end   = s.endTime   ? (() => { try { return timeFmt.format(new Date(s.endTime!))   } catch { return '' } })() : ''
      if (start && end) line += ` — ${start} to ${end}`
      else if (start)   line += ` — starts ${start}`
      return line
    })
}

/**
 * Email the attendee when their booking is moved to a different session.
 * Non-fatal — the transfer has already succeeded; a mail failure only logs.
 */
async function sendTransferEmail(
  payload: Parameters<CollectionAfterChangeHook>[0]['req']['payload'],
  req: Parameters<CollectionAfterChangeHook>[0]['req'],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  fromScheduleId: number | null,
  toScheduleId: number,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = payload as any
    const attendeeId = resolveId(doc.attendee)
    if (!attendeeId) return

    const [attendee, fromSchedule, toSchedule] = await Promise.all([
      p.findByID({ collection: 'attendees', id: attendeeId, req }),
      fromScheduleId
        ? p.findByID({ collection: 'course-schedules', id: fromScheduleId, req }).catch(() => null)
        : Promise.resolve(null),
      p.findByID({ collection: 'course-schedules', id: toScheduleId, depth: 2, req }),
    ])
    if (!attendee?.email || !toSchedule) return

    const course = typeof toSchedule.course === 'object' && toSchedule.course !== null ? toSchedule.course : null
    const courseTitle: string = course?.title ?? 'your course'
    const newLines = formatSessionDateTimeLines(toSchedule.sessions ?? [])
    const oldDates = formatSessionDates(fromSchedule?.sessions ?? [])
    const waitlisted = doc.status === 'waitlisted'

    await sendEmail({
      to: attendee.email,
      subject: `Schedule Change — ${courseTitle}`,
      message: [
        `Hi ${attendee.firstName ?? 'there'},`,
        ``,
        `Your registration for ${courseTitle} has been moved to a new session.`,
        ``,
        newLines.length === 1 ? `Your new session:` : `Your new session dates:`,
        ...newLines.map((l) => `  • ${l}`),
        ...(oldDates ? [``, `This replaces your previous session on ${oldDates}.`] : []),
        ...(waitlisted
          ? [``, `Please note: you are currently on the waitlist for this session. We'll email you as soon as your seat is confirmed.`]
          : []),
        ``,
        `If this change doesn't work for you, please get in touch and we'll help.`,
        ``,
        await questionsLine(p),
      ].join('\n'),
    })
    console.log(`[Bookings] Transfer notification sent to ${attendee.email}`)
  } catch (err) {
    // Email failure is non-fatal — the transfer itself already succeeded
    console.error('[Bookings] Transfer notification email failed:', err)
  }
}

/**
 * Resolve a relationship field value to a numeric ID.
 * Payload populates relationship fields as either a number or a populated object.
 */
function resolveId(val: unknown): number | null {
  if (!val) return null
  if (typeof val === 'number') return val
  if (typeof val === 'object' && val !== null && 'id' in val) {
    return (val as { id: number }).id
  }
  return null
}

/**
 * Safely adjust seatsBooked on a CourseSchedule.
 * delta: +1 to increment, -1 to decrement (floored at 0).
 */
async function adjustSeats(
  payload: Parameters<CollectionAfterChangeHook>[0]['req']['payload'],
  req: Parameters<CollectionAfterChangeHook>[0]['req'],
  scheduleId: number,
  delta: 1 | -1,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = payload as any
    const schedule = await p.findByID({ collection: 'course-schedules', id: scheduleId, req })
    const current = typeof schedule.seatsBooked === 'number' ? schedule.seatsBooked : 0
    const updated = Math.max(0, current + delta)
    await p.update({ collection: 'course-schedules', id: scheduleId, data: { seatsBooked: updated }, req })
  } catch (err) {
    console.error(`[Bookings] adjustSeats error (id=${scheduleId} delta=${delta}):`, err)
  }
}

/**
 * When a seat is freed from a session, promote the oldest waitlisted booking
 * to Confirmed so the spot doesn't go to waste.
 * Waitlisted → Confirmed is both-active so no second seat adjustment fires.
 */
export async function promoteFromWaitlist(
  payload: Parameters<CollectionAfterChangeHook>[0]['req']['payload'],
  req: Parameters<CollectionAfterChangeHook>[0]['req'],
  scheduleId: number,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = payload as any
    const result = await p.find({
      collection: 'bookings',
      where: {
        and: [
          { courseSchedule: { equals: scheduleId } },
          { status: { equals: 'waitlisted' } },
        ],
      },
      sort: 'createdAt',
      limit: 1,
      req,
    })
    if (result.docs.length > 0) {
      const promoted = result.docs[0]
      await p.update({
        collection: 'bookings',
        id: promoted.id,
        data: { status: 'confirmed' },
        req,
      })

      // Send waitlist-to-confirmed notification to the attendee
      try {
        const attendeeId = resolveId(promoted.attendee)
        if (attendeeId) {
          const [attendee, schedule] = await Promise.all([
            p.findByID({ collection: 'attendees', id: attendeeId, req }),
            p.findByID({ collection: 'course-schedules', id: scheduleId, depth: 2, req }),
          ])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const course = typeof schedule?.course === 'object' ? (schedule.course as any) : null
          const courseTitle: string = course?.title ?? 'your course'
          const sessionDates = formatSessionDates(schedule?.sessions ?? [])

          if (attendee?.email) {
            await sendEmail({
              to: attendee.email,
              subject: `You're In — A Seat Has Opened for ${courseTitle}`,
              message: [
                `Hi ${attendee.firstName ?? 'there'},`,
                ``,
                `Great news! A seat has opened up for ${courseTitle}${sessionDates ? ` on ${sessionDates}` : ''} and your waitlist spot has been confirmed.`,
                ``,
                `You're all set — we'll see you there!`,
                ``,
                await questionsLine(p),
              ].join('\n'),
            })
            console.log(`[Bookings] Waitlist promotion email sent to ${attendee.email}`)
          }
        }
      } catch (emailErr) {
        // Email failure is non-fatal — the promotion already succeeded
        console.error('[Bookings] Waitlist promotion email failed:', emailErr)
      }
    }
  } catch (err) {
    console.error(`[Bookings] promoteFromWaitlist error (scheduleId=${scheduleId}):`, err)
  }
}

/**
 * Blocks saving if:
 *   1. The same attendee is already booked into the same session (duplicate).
 *   2. The session is full and the booking is being set to an active status
 *      that would add a new confirmed/waitlisted count (overbooking).
 */
const validateBookingRules: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = req.payload as any

  const attendeeId = resolveId(data.attendee ?? originalDoc?.attendee)
  const scheduleId = resolveId(data.courseSchedule ?? originalDoc?.courseSchedule)
  const newStatus: string = data.status ?? originalDoc?.status ?? 'confirmed'
  const prevStatus: string | undefined = originalDoc?.status

  // ── #1: Duplicate booking check ─────────────────────────────────────────────
  if (attendeeId && scheduleId) {
    const whereClause =
      operation === 'update'
        ? {
            and: [
              { attendee: { equals: attendeeId } },
              { courseSchedule: { equals: scheduleId } },
              { id: { not_equals: originalDoc?.id } },
            ],
          }
        : {
            and: [
              { attendee: { equals: attendeeId } },
              { courseSchedule: { equals: scheduleId } },
            ],
          }

    const existing = await p.find({
      collection: 'bookings',
      where: whereClause,
      limit: 1,
      req,
    })

    if (existing.totalDocs > 0) {
      throw new APIError(
        'Duplicate booking: this attendee already has a booking for this session.',
        400, undefined, true,
      )
    }
  }

  // ── #2: Overbooking guard ────────────────────────────────────────────────────
  // Only check if the booking is newly becoming active (wasn't active before).
  const becomingActive =
    ACTIVE_STATUSES.includes(newStatus) &&
    (operation === 'create' || !ACTIVE_STATUSES.includes(prevStatus ?? ''))

  if (becomingActive && scheduleId) {
    const schedule = await p.findByID({ collection: 'course-schedules', id: scheduleId, req })
    const maxSeats: number = schedule?.maxSeats ?? 0
    const seatsBooked: number = schedule?.seatsBooked ?? 0
    const available = maxSeats - seatsBooked

    if (available <= 0 && newStatus !== 'waitlisted') {
      throw new APIError(
        `Session full: ${seatsBooked} of ${maxSeats} seats are taken. ` +
        `Set the status to Waitlisted to add this person to the waitlist instead.`,
        400, undefined, true,
      )
    }

    if (newStatus === 'waitlisted' && available > 0) {
      throw new APIError(
        `${available} seat${available === 1 ? '' : 's'} are still available in this session. ` +
        `Use Confirmed instead of Waitlisted.`,
        400, undefined, true,
      )
    }
  }

  return data
}

/**
 * When the Session (courseSchedule) changes on an update, appends a record to
 * transferHistory with the human-readable names of the old and new sessions.
 * Reads originalDoc.transferHistory so existing history is preserved.
 */
const recordTransfer: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  if (operation !== 'update') return data

  const prevScheduleId = resolveId(originalDoc?.courseSchedule)
  const newScheduleId = resolveId(data.courseSchedule)

  if (!prevScheduleId || !newScheduleId || prevScheduleId === newScheduleId) return data

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = req.payload as any
    const [fromSchedule, toSchedule] = await Promise.all([
      p.findByID({ collection: 'course-schedules', id: prevScheduleId, req }),
      p.findByID({ collection: 'course-schedules', id: newScheduleId, req }),
    ])

    const fromLabel: string = fromSchedule?.adminTitle ?? fromSchedule?.label ?? `Session ${prevScheduleId}`
    const toLabel: string = toSchedule?.adminTitle ?? toSchedule?.label ?? `Session ${newScheduleId}`

    const existing = Array.isArray(originalDoc?.transferHistory) ? originalDoc.transferHistory : []
    data.transferHistory = [
      ...existing,
      {
        fromSession: fromLabel,
        toSession: toLabel,
        transferredAt: new Date().toISOString(),
      },
    ]
  } catch (err) {
    console.error('[Bookings] recordTransfer error:', err)
  }

  return data
}

/**
 * Computes a human-readable adminTitle from the linked attendee's name.
 * Used as the document title in the CMS and in relationship dropdowns.
 */
const syncBookingTitle: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const attendeeVal = data.attendee ?? originalDoc?.attendee
  if (attendeeVal) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = req.payload as any
      const attendeeId =
        typeof attendeeVal === 'object' && attendeeVal !== null
          ? (attendeeVal as { id: number }).id
          : attendeeVal
      const attendee = await p.findByID({ collection: 'attendees', id: attendeeId, req })
      const name = `${attendee?.firstName ?? ''} ${attendee?.lastName ?? ''}`.trim()
      data.adminTitle = name || String(attendeeId)
    } catch {
      data.adminTitle = String(attendeeVal)
    }
  }
  return data
}

const afterChangeHook: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  const { payload } = req

  if (operation === 'create') {
    if (ACTIVE_STATUSES.includes(doc.status)) {
      const scheduleId = resolveId(doc.courseSchedule)
      if (scheduleId) await adjustSeats(payload, req, scheduleId, +1)
    }
  } else if (operation === 'update') {
    const prevScheduleId = resolveId(previousDoc?.courseSchedule)
    const newScheduleId = resolveId(doc.courseSchedule)
    const prevActive = ACTIVE_STATUSES.includes(previousDoc?.status)
    const newActive = ACTIVE_STATUSES.includes(doc.status)
    const scheduleChanged =
      prevScheduleId !== null &&
      newScheduleId !== null &&
      prevScheduleId !== newScheduleId

    if (scheduleChanged) {
      // Booking transferred to a different session — free old seat, claim new one
      if (prevActive && prevScheduleId) {
        await adjustSeats(payload, req, prevScheduleId, -1)
        await promoteFromWaitlist(payload, req, prevScheduleId)
      }
      if (newActive && newScheduleId) {
        await adjustSeats(payload, req, newScheduleId, +1)
        // Tell the attendee their session changed (non-fatal)
        await sendTransferEmail(payload, req, doc, prevScheduleId, newScheduleId)
      }
    } else if (newScheduleId && previousDoc?.status !== doc.status) {
      // Same session, status changed
      if (prevActive && !newActive) {
        // Seat freed — decrement and promote oldest waitlisted person
        await adjustSeats(payload, req, newScheduleId, -1)
        await promoteFromWaitlist(payload, req, newScheduleId)
      } else if (!prevActive && newActive) {
        await adjustSeats(payload, req, newScheduleId, +1)
      }
    }
  }

  // ── Square refund on admin cancellation ───────────────────────────────────
  // Only when: status changed to 'cancelled', previous status was active,
  // and the booking has a Square payment ID (i.e. it was paid online).
  const wasCancelled =
    doc.status === 'cancelled' &&
    previousDoc?.status !== 'cancelled' &&
    ACTIVE_STATUSES.includes(previousDoc?.status ?? '')

  if (wasCancelled && doc.squarePaymentId && doc.amountPaidCents && !doc.skipRefund) {
    await issueSquareRefund(doc.squarePaymentId, doc.amountPaidCents)
  }

  return doc
}

const beforeDeleteHook: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const { payload } = req
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = payload as any

  let booking: Record<string, unknown>
  try {
    booking = await p.findByID({ collection: 'bookings', id, req })
  } catch (err) {
    console.error('[Bookings] beforeDelete — could not load booking:', err)
    return
  }

  // ── Guard: only allow deleting cancelled bookings ─────────────────────────
  // Cancelling a booking (via the status field) triggers the Square refund and
  // frees the seat automatically. Hard-deleting an active booking would skip
  // both. Admins must cancel first, then delete if they want to remove the record.
  if (booking.status !== 'cancelled') {
    throw new APIError(
      `Cannot delete a booking with status "${booking.status}". ` +
      `Set the status to Cancelled first — this will automatically issue any Square refund and free the seat. ` +
      `You can then delete the record.`,
      400, undefined, true,
    )
  }
}

import { timingSafeEqual } from 'crypto'

/**
 * Constant-time string comparison to prevent timing-based secret extraction.
 */
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

/**
 * Allow access (read or write) from a logged-in Payload admin user, or
 * from the website backend presenting the shared CMS_WRITE_SECRET bearer token.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function allowAccess({ req }: { req: any }): boolean {
  if (req?.user) return true
  const auth: string = req?.headers?.get?.('authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  const secret = process.env.CMS_WRITE_SECRET ?? ''
  return safeCompare(token, secret)
}

const allowWriteAccess = allowAccess

export const Bookings: CollectionConfig = {
  slug: 'bookings',
  labels: {
    singular: 'Booking',
    plural: 'Bookings',
  },
  admin: {
    useAsTitle: 'adminTitle',
    group: 'Course Management',
    defaultColumns: ['adminTitle', 'courseSchedule', 'status', 'squarePaymentId', 'amountPaidCents'],
    description:
      'Course registrations. Each booking links an Attendee to a specific course session.',
    components: {
      beforeList: ['./components/PrintRosterListAction'],
    },
  },
  disableDuplicate: true,
  access: {
    read: allowAccess,
    create: allowAccess,
    update: allowAccess,
  },
  hooks: {
    beforeChange: [validateBookingRules, recordTransfer, syncBookingTitle],
    afterChange: [afterChangeHook],
    beforeDelete: [beforeDeleteHook],
  },
  fields: [
    // Auto-managed — used as the document title in the CMS
    {
      name: 'adminTitle',
      type: 'text',
      admin: { hidden: true },
    },
    {
      name: 'attendee',
      type: 'relationship',
      relationTo: 'attendees',
      required: true,
      label: 'Attendee',
      admin: {
        description:
          'The person being booked. If they are new, create an Attendee record first.',
      },
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
      label: 'Course',
      admin: {
        description: 'Which course this booking is for.',
      },
    },
    {
      name: 'courseSchedule',
      type: 'relationship',
      relationTo: 'course-schedules',
      required: true,
      label: 'Session',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filterOptions: ({ siblingData }: any) => {
        if (siblingData?.course) {
          return { course: { equals: siblingData.course } }
        }
        return true
      },
      admin: {
        description:
          'Select a Course first — this list will then show only sessions for that course.',
      },
    },
    // Live warning shown when the Session above is changed to a different
    // session (a transfer): flags overbooking and waitlist queue-jumping.
    // Informational only — never blocks the save. No DB column (ui field).
    {
      name: 'transferWarning',
      type: 'ui',
      admin: {
        components: {
          Field: './components/TransferWarning',
        },
      },
    },
    {
      name: 'paymentReference',
      type: 'text',
      label: 'Payment Reference',
      admin: {
        hidden: true,
        description: 'Internal reference kept for legacy/audit purposes. Use Square Payment ID instead.',
      },
    },
    // ── Square-specific fields (auto-populated on online bookings) ──────────
    {
      name: 'squarePaymentId',
      type: 'text',
      label: 'Square Payment ID',
      admin: {
        readOnly: true,
        description: 'Full payment ID from Square (e.g. RWF1bO7TF…). The first 4 characters match the receipt number shown in Square Dashboard. Required to issue refunds.',
      },
    },
    {
      name: 'squareOrderId',
      type: 'text',
      label: 'Square Order ID',
      admin: {
        readOnly: true,
        description: 'Order ID from Square. Use this to look up the transaction in Square Dashboard → Payments → Orders.',
      },
    },
    {
      name: 'paymentMethod',
      type: 'select',
      label: 'Payment Method',
      options: [
        { label: 'Online (website booking)', value: 'online' },
        { label: 'Square (POS / payment link)', value: 'square-manual' },
        { label: 'Cash', value: 'cash' },
        { label: 'Check', value: 'check' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        description:
          'Set automatically to "Online" for website bookings. For manually entered bookings, select how the attendee paid.',
        components: {
          Cell: './components/PaymentMethodCell',
        },
      },
    },
    {
      name: 'amountPaidCents',
      type: 'number',
      label: 'Amount Paid',
      min: 0,
      admin: {
        description:
          'Auto-populated from Square for online bookings. ' +
          'For manual/cash bookings, enter the dollar amount collected (e.g. 225 or 225.00).',
        components: {
          Field: './components/DollarsField',
        },
      },
    },
    {
      name: 'discountCode',
      type: 'text',
      label: 'Discount Code',
      admin: {
        readOnly: true,
        description: 'Discount code applied at checkout, if any.',
        condition: (data) => Boolean(data?.discountCode),
      },
    },
    {
      name: 'discountCents',
      type: 'number',
      label: 'Discount Amount',
      admin: {
        readOnly: true,
        description: 'Amount taken off the course price by the discount code. Amount Paid already reflects this.',
        condition: (data) => Boolean(data?.discountCode),
        components: {
          Field: './components/DollarsField',
        },
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Admin Notes',
      admin: {
        description: 'Internal notes visible only to admins (e.g. special accommodations).',
      },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Booking Status',
      required: true,
      defaultValue: 'confirmed',
      options: [
        { label: 'Confirmed',  value: 'confirmed' },
        { label: 'Waitlisted', value: 'waitlisted' },
        { label: 'Cancelled',  value: 'cancelled' },
      ],
      admin: {
        components: {
          Cell: './components/StatusBadge',
          // Guided panel: current status + explicit action buttons. Cancelling
          // asks how to handle the refund in the moment (drives skipRefund),
          // and every change shows a what-Save-will-do summary with Undo.
          Field: './components/BookingStatusPanel',
        },
      },
    },
    {
      name: 'skipRefund',
      type: 'checkbox',
      label: 'Cancel without issuing a refund',
      defaultValue: false,
      admin: {
        // Not rendered — set by the Booking Status panel's cancel flow.
        hidden: true,
      },
    },
    {
      name: 'manualRefundAmountCents',
      type: 'number',
      label: 'Manual Refund Amount',
      min: 0,
      admin: {
        description:
          'If you issued a refund outside of Square (cash, POS, etc.), enter the dollar amount refunded ' +
          '(e.g. 225 or 225.00). This is recorded for reporting purposes only — it does not trigger any payment action.',
        condition: (data) => data.skipRefund === true || data.status === 'cancelled',
        components: {
          Field: './components/DollarsField',
        },
      },
    },
    {
      name: 'transferHistory',
      type: 'array',
      label: 'Transfer History',
      admin: {
        readOnly: true,
        description: 'Automatically recorded each time this booking is moved to a different session. Cannot be edited manually.',
        initCollapsed: true,
        condition: (data) => Array.isArray(data.transferHistory) && data.transferHistory.length > 0,
        components: {
          RowLabel: './components/TransferRowLabel',
        },
      },
      fields: [
        {
          name: 'fromSession',
          type: 'text',
          label: 'From Session',
          admin: { readOnly: true },
        },
        {
          name: 'toSession',
          type: 'text',
          label: 'To Session',
          admin: { readOnly: true },
        },
        {
          name: 'transferredAt',
          type: 'date',
          label: 'Date & Time',
          admin: {
            readOnly: true,
            date: {
              pickerAppearance: 'dayAndTime',
              displayFormat: 'MMM d, yyyy  h:mm aa',
            },
          },
        },
      ],
    },
  ],
}
