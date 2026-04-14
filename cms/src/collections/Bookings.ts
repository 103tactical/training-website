import { APIError } from 'payload'
import type {
  CollectionConfig,
  CollectionAfterChangeHook,
  CollectionBeforeDeleteHook,
  CollectionBeforeChangeHook,
} from 'payload'

/** Statuses that count against a schedule's seat inventory */
const ACTIVE_STATUSES = ['confirmed', 'waitlisted']

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
      await p.update({
        collection: 'bookings',
        id: result.docs[0].id,
        data: { status: 'confirmed' },
        req,
      })
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

  return doc
}

const beforeDeleteHook: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const { payload } = req
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = payload as any
    const booking = await p.findByID({ collection: 'bookings', id, req })
    if (ACTIVE_STATUSES.includes(booking.status)) {
      const scheduleId = resolveId(booking.courseSchedule)
      if (scheduleId) {
        await adjustSeats(payload, req, scheduleId, -1)
        await promoteFromWaitlist(payload, req, scheduleId)
      }
    }
  } catch (err) {
    console.error('[Bookings] beforeDelete hook error:', err)
  }
}

export const Bookings: CollectionConfig = {
  slug: 'bookings',
  labels: {
    singular: 'Booking',
    plural: 'Bookings',
  },
  admin: {
    useAsTitle: 'adminTitle',
    group: 'Course Management',
    defaultColumns: ['adminTitle', 'courseSchedule', 'status', 'transferHistory'],
    description:
      'Course registrations. Each booking links an Attendee to a specific course session.',
    components: {
      beforeList: ['./components/PrintRosterListAction'],
    },
  },
  access: {
    read: () => true,
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
          'Confirmed and Waitlisted count against available seats. Cancelled frees the seat and automatically promotes the next Waitlisted person. To move someone to a different session, change the Session field above.',
        components: {
          Cell: './components/StatusBadge',
        },
      },
    },
    {
      name: 'paymentReference',
      type: 'text',
      label: 'Payment Reference',
      admin: {
        description: 'Optional transaction ID or receipt number from the payment processor.',
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
      name: 'transferHistory',
      type: 'array',
      label: 'Transfer History',
      admin: {
        readOnly: true,
        description: 'Automatically recorded each time this booking is moved to a different session. Cannot be edited manually.',
        initCollapsed: true,
        condition: (data) => Array.isArray(data.transferHistory) && data.transferHistory.length > 0,
        components: {
          RowLabel: './components/TransferCountCell',
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
