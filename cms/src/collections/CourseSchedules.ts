import { APIError } from "payload";
import type { CollectionConfig, CollectionBeforeChangeHook, CollectionBeforeDeleteHook, PayloadRequest } from "payload";
import { sendBulkEmail } from "../lib/email";

/**
 * Auto-populates adminTitle as "Course Name: Internal Label" on every save.
 * This gives relationship dropdowns (e.g. Attendee → Session) a clear,
 * unambiguous display value without showing raw IDs.
 */
const syncAdminTitle: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const courseVal = data.course ?? originalDoc?.course
  const labelVal = data.label ?? originalDoc?.label ?? ""

  if (courseVal) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = req.payload as any
      const courseId =
        typeof courseVal === "object" && courseVal !== null
          ? (courseVal as { id: number }).id
          : courseVal
      const course = await p.findByID({ collection: "courses", id: courseId, req })
      const name: string = course?.title ?? ""
      data.adminTitle = name ? `${name}: ${labelVal}` : labelVal
    } catch {
      data.adminTitle = labelVal
    }
  } else {
    data.adminTitle = labelVal
  }

  return data
}

// ── Delete guard ──────────────────────────────────────────────────────────────

/**
 * Prevent deleting a session that still has confirmed or waitlisted bookings.
 * The admin must cancel all bookings for this session first.
 */
const beforeDeleteHook: CollectionBeforeDeleteHook = async ({ id, req }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = req.payload as any
  const result = await p.find({
    collection: 'bookings',
    where: {
      and: [
        { courseSchedule: { equals: id } },
        { status: { in: ['confirmed', 'waitlisted'] } },
      ],
    },
    limit: 1,
    req,
  })
  if (result.totalDocs > 0) {
    throw new APIError(
      'Cannot delete this session — it has active bookings (Confirmed or Waitlisted). ' +
      'Cancel all bookings for this session first, then delete it.',
      400, undefined, true,
    )
  }
}

// ── Email attendees endpoint ──────────────────────────────────────────────────

async function emailAttendeesHandler(req: PayloadRequest): Promise<Response> {
  if (!req.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const scheduleId = req.routeParams?.id
  if (!scheduleId) {
    return Response.json({ error: 'Missing schedule id' }, { status: 400 })
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

  // Find all confirmed + waitlisted bookings for this session
  const bookingsResult = await p.find({
    collection: 'bookings',
    where: {
      and: [
        { courseSchedule: { equals: scheduleId } },
        { status: { in: ['confirmed', 'waitlisted'] } },
      ],
    },
    limit: 500,
    depth: 1,
    req,
  })

  if (bookingsResult.totalDocs === 0) {
    return Response.json({ sent: 0, failed: 0, errors: [], note: 'No confirmed or waitlisted attendees found for this session.' })
  }

  // Collect unique email addresses from the resolved attendee relationship
  const emails: string[] = []
  for (const booking of bookingsResult.docs) {
    const attendee = booking.attendee
    const email: string | undefined =
      typeof attendee === 'object' && attendee !== null
        ? (attendee as { email?: string }).email
        : undefined
    if (email) emails.push(email)
  }

  if (emails.length === 0) {
    return Response.json({ sent: 0, failed: 0, errors: [], note: 'Bookings found but no attendee email addresses could be resolved.' })
  }

  try {
    const result = await sendBulkEmail({ recipients: emails, subject: subject.trim(), message: message.trim() })
    return Response.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: msg }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export const CourseSchedules: CollectionConfig = {
  slug: "course-schedules",
  admin: {
    useAsTitle: "adminTitle",
    group: "Course Management",
    defaultColumns: ["course", "label", "maxSeats", "seatsBooked", "isActive"],
    description:
      "Define available date slots for each course. Each slot can contain one or more session dates (e.g. two non-adjacent Fridays for a 2-day course).",
  },
  disableDuplicate: true,
  access: {
    read: () => true,
  },
  hooks: {
    beforeChange: [syncAdminTitle],
    beforeDelete: [beforeDeleteHook],
  },
  endpoints: [
    {
      path: '/:id/email-attendees',
      method: 'post',
      handler: emailAttendeesHandler,
    },
  ],
  fields: [
    // Auto-managed — hidden from UI, used as the document title in dropdowns
    {
      name: "adminTitle",
      type: "text",
      admin: { hidden: true },
    },
    // ── 1. Course Info (collapsible) ─────────────────────────────────────────
    {
      type: "collapsible",
      label: "Course Info",
      admin: {
        initCollapsed: false,
      },
      fields: [
        {
          name: "course",
          type: "relationship",
          relationTo: "courses",
          required: true,
          label: "Course",
        },
        {
          name: "label",
          type: "text",
          label: "Internal Label",
          admin: {
            description:
              'Admin-only identifier — use dates for clarity, e.g. "Mar 20" or "Jun 5 / Jun 12". This is what appears in dropdowns when adding an attendee.',
          },
        },
        {
          name: "displayLabel",
          type: "text",
          label: "Display Label",
          admin: {
            description:
              'Visitor-facing session name shown on the schedule page, e.g. "Afternoon Session". Falls back to Internal Label if left blank.',
          },
        },
        {
          name: "instructor",
          type: "relationship",
          relationTo: "instructors",
          label: "Instructor",
          admin: {
            description:
              "Select the instructor leading this session. Manage instructors under Course Management → Instructors.",
          },
        },
        {
          type: "row",
          fields: [
            {
              name: "maxSeats",
              type: "number",
              label: "Total Seats",
              required: true,
              min: 1,
              admin: {
                description: "Total number of seats available for this slot.",
              },
            },
            {
              name: "seatsBooked",
              type: "number",
              label: "Seats Booked",
              defaultValue: 0,
              min: 0,
              admin: {
                description: "Auto-managed by booking hooks.",
              },
            },
            {
              name: "isActive",
              type: "checkbox",
              label: "Active (show on site)",
              defaultValue: true,
            },
          ],
        },
      ],
    },

    // ── 2. Session Dates (collapsible) ───────────────────────────────────────
    {
      type: "collapsible",
      label: "Session Dates",
      admin: {
        initCollapsed: false,
      },
      fields: [
        {
          name: "sessions",
          type: "array",
          label: false,
          minRows: 1,
          labels: {
            singular: "Day",
            plural: "Days",
          },
          admin: {
            description:
              "Add one entry for each day this course meets. Every day the class convenes — whether consecutive or not — needs its own entry here.",
            components: {
              RowLabel: "./components/DayRowLabel",
            },
          },
          fields: [
            {
              name: "date",
              type: "date",
              required: true,
              label: "Date",
              admin: {
                date: {
                  pickerAppearance: "dayOnly",
                  displayFormat: "MMM d, yyyy",
                },
              },
            },
            {
              name: "startTime",
              type: "date",
              label: "Start Time",
              admin: {
                date: {
                  pickerAppearance: "timeOnly",
                  displayFormat: "h:mm aa",
                },
              },
            },
            {
              name: "endTime",
              type: "date",
              label: "End Time",
              admin: {
                date: {
                  pickerAppearance: "timeOnly",
                  displayFormat: "h:mm aa",
                },
              },
            },
          ],
        },
      ],
    },

    // ── 3. Attendee Roster (collapsible) ─────────────────────────────────────
    {
      type: "collapsible",
      label: "Attendee Roster",
      admin: {
        initCollapsed: false,
      },
      fields: [
        // ── Print + Email action buttons ────────────────────────────────────
        {
          name: "rosterActions",
          type: "ui",
          admin: {
            components: {
              Field: "./components/RosterActionsBar",
            },
          },
        },
        {
          name: "roster",
          type: "join",
          collection: "bookings",
          on: "courseSchedule",
          label: "Bookings",
          defaultLimit: 0,
          defaultSort: "adminTitle",
          admin: {
            defaultColumns: ["adminTitle", "status", "paymentReference"],
            description:
              "Bookings for this session. Go to Course Management → Bookings to add or manage registrations.",
          },
        },
      ],
    },
  ],
};
