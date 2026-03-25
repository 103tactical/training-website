import type {
  CollectionConfig,
  CollectionAfterChangeHook,
  CollectionBeforeDeleteHook,
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
    console.error(`[Attendees] adjustSeats error (id=${scheduleId} delta=${delta}):`, err)
  }
}

const afterChangeHook: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  const { payload } = req

  if (operation === 'create') {
    // New booking — increment if status is active
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
      // Attendee transferred to a different session
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
    const attendee = await p.findByID({ collection: 'attendees', id, req })
    if (ACTIVE_STATUSES.includes(attendee.status)) {
      const scheduleId = resolveId(attendee.courseSchedule)
      if (scheduleId) await adjustSeats(payload, req, scheduleId, -1)
    }
  } catch (err) {
    console.error('[Attendees] beforeDelete hook error:', err)
  }
}

export const Attendees: CollectionConfig = {
  slug: 'attendees',
  labels: {
    singular: 'Attendee',
    plural: 'Attendee Rosters',
  },
  admin: {
    useAsTitle: 'firstName',
    group: 'Course Management',
    defaultColumns: ['firstName', 'lastName', 'email', 'course', 'courseSchedule', 'status'],
    description:
      'Manage course bookings. Use the Course and Session filters to view rosters for a specific course or session.',
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [afterChangeHook],
    beforeDelete: [beforeDeleteHook],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'firstName',
          type: 'text',
          label: 'First Name',
          required: true,
        },
        {
          name: 'lastName',
          type: 'text',
          label: 'Last Name',
          required: true,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'email',
          type: 'email',
          label: 'Email Address',
          required: true,
        },
        {
          name: 'phone',
          type: 'text',
          label: 'Phone Number',
        },
      ],
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
      label: 'Course',
      admin: {
        description: 'Which course this attendee is enrolled in.',
      },
    },
    {
      name: 'courseSchedule',
      type: 'relationship',
      relationTo: 'course-schedules',
      required: true,
      label: 'Session',
      admin: {
        description: 'The specific session slot (date range) the attendee has booked.',
      },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Booking Status',
      required: true,
      defaultValue: 'confirmed',
      options: [
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Waitlisted', value: 'waitlisted' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      admin: {
        description:
          'Confirmed and Waitlisted count against available seats. Changing to Cancelled frees the seat automatically.',
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
