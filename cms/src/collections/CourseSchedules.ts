import type { CollectionConfig, CollectionBeforeChangeHook } from "payload";

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

export const CourseSchedules: CollectionConfig = {
  slug: "course-schedules",
  admin: {
    useAsTitle: "adminTitle",
    group: "Course Management",
    defaultColumns: ["course", "label", "maxSeats", "seatsBooked", "isActive"],
    description:
      "Define available date slots for each course. Each slot can contain one or more session dates (e.g. two non-adjacent Fridays for a 2-day course).",
  },
  access: {
    read: () => true,
  },
  hooks: {
    beforeChange: [syncAdminTitle],
  },
  fields: [
    // Auto-managed — hidden from UI, used as the document title in dropdowns
    {
      name: "adminTitle",
      type: "text",
      admin: { hidden: true },
    },
    // ── Print Roster shortcut ─────────────────────────────────────────────────
    {
      name: "printRosterLink",
      type: "ui",
      admin: {
        components: {
          Field: "./components/PrintRosterButton",
        },
      },
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
        {
          name: "roster",
          type: "join",
          collection: "attendees",
          on: "courseSchedule",
          label: "Attendees",
          defaultLimit: 0,
          defaultSort: "lastName",
          admin: {
            defaultColumns: ["firstName", "lastName", "email", "phone", "status"],
            description:
              "Attendees booked into this session. Use 'Add Attendee' to manually register someone.",
          },
        },
      ],
    },
  ],
};
