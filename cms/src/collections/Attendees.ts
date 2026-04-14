import { timingSafeEqual } from 'crypto'
import { APIError } from 'payload'
import type { CollectionConfig, CollectionBeforeDeleteHook } from 'payload'

/**
 * Constant-time comparison of two strings to prevent timing attacks.
 * Returns true only if both strings are identical in length and content.
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
 * Allow access (read or write) from:
 *   1. A logged-in Payload admin user (admin UI / session)
 *   2. The website backend presenting the shared CMS_WRITE_SECRET bearer token
 *
 * This prevents unauthenticated public access to sensitive collections
 * (Attendees, Bookings) which contain PII.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function allowAccess({ req }: { req: any }): boolean {
  if (req?.user) return true
  const auth: string = req?.headers?.get?.('authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  const secret = process.env.CMS_WRITE_SECRET ?? ''
  return safeCompare(token, secret)
}

/** Backwards-compat alias */
const allowWriteAccess = allowAccess

/**
 * Prevent deleting an attendee who still has active bookings.
 * The admin must cancel all bookings first.
 */
const beforeDeleteHook: CollectionBeforeDeleteHook = async ({ id, req }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = req.payload as any
  const result = await p.find({
    collection: 'bookings',
    where: {
      and: [
        { attendee: { equals: id } },
        { status: { in: ['confirmed', 'waitlisted'] } },
      ],
    },
    limit: 1,
    req,
  })
  if (result.totalDocs > 0) {
    throw new APIError(
      'Cannot delete this attendee — they have one or more active bookings (Confirmed or Waitlisted). ' +
      'Cancel all of their bookings first, then delete the attendee record.',
      400, undefined, true,
    )
  }
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
  disableDuplicate: true,
  access: {
    read: allowAccess,
    create: allowAccess,
    update: allowAccess,
  },
  hooks: {
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
