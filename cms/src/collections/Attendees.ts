import type { CollectionConfig } from 'payload'

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
