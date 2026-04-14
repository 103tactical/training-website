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
      // Booking transferred to a different session
      if (prevActive && prevScheduleId) await adjustSeats(payload, req, prevScheduleId, -1)
      if (newActive && newScheduleId) await adjustSeats(payload, req, newScheduleId, +1)
    } else if (newScheduleId && previousDoc?.status !== doc.status) {
      // Same session, status changed
      if (prevActive && !newActive) {
        await adjustSeats(payload, req, newScheduleId, -1)
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
      if (scheduleId) await adjustSeats(payload, req, scheduleId, -1)
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
    defaultColumns: ['adminTitle', 'courseSchedule', 'status'],
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
    beforeChange: [syncBookingTitle],
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
        { label: 'Confirmed',   value: 'confirmed' },
        { label: 'Waitlisted',  value: 'waitlisted' },
        { label: 'Cancelled',   value: 'cancelled' },
        { label: 'Transferred', value: 'transferred' },
      ],
      admin: {
        description:
          'Confirmed and Waitlisted count against available seats. Cancelled and Transferred free the seat automatically.',
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
  ],
}
