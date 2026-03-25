import type { CollectionConfig } from "payload";

export const CourseSchedules: CollectionConfig = {
  slug: "course-schedules",
  admin: {
    useAsTitle: "label",
    group: "Course Management",
    defaultColumns: ["course", "label", "maxSeats", "seatsBooked", "isActive"],
    description:
      "Define available date slots for each course. Each slot can contain one or more session dates (e.g. two non-adjacent Fridays for a 2-day course).",
  },
  access: {
    read: () => true,
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
          'Visitor-facing session name shown on the schedule page, e.g. "Spring Session". Falls back to Internal Label if left blank.',
      },
    },
    {
      name: "sessions",
      type: "array",
      label: "Session Dates",
      minRows: 1,
      admin: {
        description: "Add one row per day. For a 2-day course on two separate Fridays, add two rows.",
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
    {
      name: "instructor",
      type: "relationship",
      relationTo: "instructors",
      label: "Instructor",
      admin: {
        description: "Select the instructor leading this session. Manage instructors under Course Management → Instructors.",
      },
    },
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
        description: "Increment as students register to track remaining seats.",
      },
    },
    {
      name: "isActive",
      type: "checkbox",
      label: "Active (show on site)",
      defaultValue: true,
    },
  ],
};
