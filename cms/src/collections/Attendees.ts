import type { CollectionConfig } from 'payload'

/**
 * Allow writes from the website backend using the shared CMS_WRITE_SECRET.
 * Logged-in admin users are always allowed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function allowWriteAccess({ req }: { req: any }): boolean {
  if (req?.user) return true
  const auth: string = req?.headers?.get?.('authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  return Boolean(token && token === process.env.CMS_WRITE_SECRET)
}

export const Attendees: CollectionConfig = {
  slug: 'attendees',
  labels: {
    singular: 'Attendee',
    plural: 'Attendees',
  },
  admin: {
    useAsTitle: 'firstName',
    group: 'Course Management',
    defaultColumns: ['firstName', 'lastName', 'email', 'phone'],
    description:
      'One record per person. Create an Attendee here first, then add Bookings to link them to specific course sessions.',
  },
  access: {
    read: () => true,
    create: allowWriteAccess,
    update: allowWriteAccess,
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
          admin: {
            components: {
              Cell: './components/EmailCell',
            },
          },
        },
        {
          name: 'phone',
          type: 'text',
          label: 'Phone Number',
        },
      ],
    },
    {
      name: 'bookings',
      type: 'join',
      collection: 'bookings',
      on: 'attendee',
      label: 'Bookings',
      defaultLimit: 0,
      admin: {
        defaultColumns: ['courseSchedule', 'status'],
        description: 'All course bookings for this attendee.',
      },
    },
  ],
}
