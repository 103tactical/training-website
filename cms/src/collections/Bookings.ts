import { APIError } from 'payload'
import type {
  CollectionConfig,
  CollectionAfterChangeHook,
  CollectionBeforeDeleteHook,
  CollectionBeforeChangeHook,
} from 'payload'
import { SquareClient, SquareEnvironment } from 'square'
import { sendEmail } from '../lib/email'

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
async function promoteFromWaitlist(
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
                `Questions? Reply to this email.`,
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

    if (available <= 0) {
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
      if (newActive && newScheduleId) await adjustSeats(payload, req, newScheduleId, +1)
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
      name: 'amountPaidCents',
      type: 'number',
      label: 'Amount Paid (cents)',
      admin: {
        readOnly: true,
        description: 'Amount charged in cents (e.g. 22500 = $225.00). Auto-populated from Square.',
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
        description:
          'Confirmed and Waitlisted count against available seats. Cancelled frees the seat, automatically refunds the customer (if paid online), and promotes the next Waitlisted person. To move someone to a different session, change the Session field above.',
        components: {
          Cell: './components/StatusBadge',
        },
      },
    },
    {
      name: 'skipRefund',
      type: 'checkbox',
      label: 'Cancel without issuing a refund',
      defaultValue: false,
      admin: {
        description:
          'Check this box BEFORE setting status to Cancelled if you do NOT want to issue a Square refund. ' +
          'Leave unchecked (default) to automatically refund the customer when cancelling.',
        condition: (data) => data.status !== 'cancelled',
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
