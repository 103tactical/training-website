import { timingSafeEqual } from 'crypto'
import type { CollectionConfig, PayloadRequest } from 'payload'
import { validateDiscountCode, redeemDiscountCode } from '../lib/discount'

// ── Access control (same pattern as Attendees / Bookings / PendingBookings) ───

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function allowAccess({ req }: { req: any }): boolean {
  if (req?.user) return true
  const auth: string = req?.headers?.get?.('authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  const secret = process.env.CMS_WRITE_SECRET ?? ''
  return safeCompare(token, secret)
}

// ── Endpoint auth helper (endpoints bypass collection access control) ─────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function endpointAuthorized(req: any): boolean {
  return allowAccess({ req })
}

// ── Validate endpoint ─────────────────────────────────────────────────────────
// POST /api/discount-codes/validate  { code, courseId, priceInCents }
// Called by the website booking form (bearer CMS_WRITE_SECRET).

async function validateHandler(req: PayloadRequest): Promise<Response> {
  if (!endpointAuthorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { code?: string; courseId?: number; priceInCents?: number }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body = (await (req as any).json()) as typeof body
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const code = typeof body.code === 'string' ? body.code : ''
  const courseId = Number(body.courseId)
  const priceInCents = Number(body.priceInCents)
  if (!code || !courseId || !priceInCents || priceInCents <= 0) {
    return Response.json({ valid: false, reason: 'That code is not valid.' })
  }

  try {
    const result = await validateDiscountCode({
      payload: req.payload,
      req,
      code,
      courseId,
      priceInCents,
    })
    return Response.json(result)
  } catch (err) {
    console.error('[discount-codes] validate error:', err)
    return Response.json(
      { valid: false, reason: 'Could not check that code right now. Please try again.' },
      { status: 500 },
    )
  }
}

// ── Redeem endpoint ───────────────────────────────────────────────────────────
// POST /api/discount-codes/redeem  { code }
// Called by the payment webhook after a booking is created. Non-fatal.

async function redeemHandler(req: PayloadRequest): Promise<Response> {
  if (!endpointAuthorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { code?: string }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body = (await (req as any).json()) as typeof body
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const ok = await redeemDiscountCode({
      payload: req.payload,
      req,
      code: typeof body.code === 'string' ? body.code : '',
    })
    return Response.json({ redeemed: ok })
  } catch (err) {
    console.error('[discount-codes] redeem error:', err)
    return Response.json({ redeemed: false }, { status: 500 })
  }
}

// ── Collection ────────────────────────────────────────────────────────────────

export const DiscountCodes: CollectionConfig = {
  slug: 'discount-codes',
  labels: {
    singular: 'Discount Code',
    plural: 'Discount Codes',
  },
  admin: {
    useAsTitle: 'code',
    group: 'Accounting & Reports',
    defaultColumns: ['code', 'active', 'appliesTo', 'timesRedeemed', 'expiresAt'],
    description:
      'Discount codes for online course bookings. Customers enter a code on the booking page; ' +
      'the discount comes off the course price and the card fee is recalculated on the lower amount. ' +
      'Codes also work in the "Send Payment Link" tool on a session roster. ' +
      'Do NOT create coupons inside Square itself — those bypass the website and are invisible here.',
  },
  disableDuplicate: true,
  access: {
    read: allowAccess,
    create: ({ req }) => Boolean(req?.user),
    update: allowAccess, // webhook (bearer secret) increments timesRedeemed
    delete: ({ req }) => Boolean(req?.user),
  },
  endpoints: [
    { path: '/validate', method: 'post', handler: validateHandler },
    { path: '/redeem', method: 'post', handler: redeemHandler },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        // Trim only — the field's validate enforces the strict format so the
        // admin always sees exactly what will be saved (no silent rewriting).
        if (typeof data?.code === 'string') data.code = data.code.trim()
        return data
      },
    ],
  },
  fields: [
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Code',
      minLength: 3,
      maxLength: 32,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validate: (val: any) => {
        const v = typeof val === 'string' ? val.trim() : ''
        if (/\s/.test(v)) return 'Codes cannot contain spaces.'
        if (/[a-z]/.test(v)) return 'Codes must be ALL CAPS (e.g. VET10).'
        if (!/^[A-Z0-9]{3,32}$/.test(v)) {
          return 'Use capital letters and numbers only, 3–32 characters (e.g. VET10).'
        }
        return true
      },
      admin: {
        description:
          'What the customer types at checkout. CAPITAL letters and numbers only, no spaces (e.g. VET10). Customers can enter it in any case — it will still match.',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Active',
      defaultValue: true,
      admin: {
        description: 'Uncheck to turn the code off immediately without deleting it.',
      },
    },
    {
      name: 'discountType',
      type: 'select',
      label: 'Discount Type',
      required: true,
      defaultValue: 'percent',
      options: [
        { label: 'Percentage off', value: 'percent' },
        { label: 'Fixed dollar amount off', value: 'fixed' },
      ],
    },
    {
      name: 'percentOff',
      type: 'number',
      label: 'Percent Off (%)',
      min: 1,
      max: 100,
      admin: {
        description: 'e.g. 10 for 10% off the course price.',
        condition: (data) => data?.discountType !== 'fixed',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validate: (val: any, { siblingData }: any) => {
        if (siblingData?.discountType !== 'fixed' && (typeof val !== 'number' || val <= 0)) {
          return 'Enter the percentage to take off (1–100).'
        }
        return true
      },
    },
    {
      name: 'amountOffCents',
      type: 'number',
      label: 'Amount Off',
      min: 0,
      admin: {
        description: 'Dollar amount to take off the course price (e.g. 25 or 25.00).',
        condition: (data) => data?.discountType === 'fixed',
        components: {
          Field: './components/DollarsField',
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validate: (val: any, { siblingData }: any) => {
        if (siblingData?.discountType === 'fixed' && (typeof val !== 'number' || val <= 0)) {
          return 'Enter the dollar amount to take off.'
        }
        return true
      },
    },
    {
      name: 'appliesTo',
      type: 'select',
      label: 'Applies To',
      required: true,
      defaultValue: 'all',
      options: [
        { label: 'All courses', value: 'all' },
        { label: 'Specific courses only', value: 'specific' },
      ],
    },
    {
      name: 'courses',
      type: 'relationship',
      relationTo: 'courses',
      hasMany: true,
      label: 'Eligible Courses',
      admin: {
        description: 'The code only works for bookings of these courses.',
        condition: (data) => data?.appliesTo === 'specific',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validate: (val: any, { siblingData }: any) => {
        if (siblingData?.appliesTo === 'specific' && (!Array.isArray(val) || val.length === 0)) {
          return 'Select at least one course, or set Applies To back to "All courses".'
        }
        return true
      },
    },
    {
      name: 'expiresAt',
      type: 'date',
      label: 'Valid Through',
      admin: {
        description:
          'Optional. Last day the code can be used (Eastern Time — valid through the end of that day). Leave empty for no expiration.',
        date: {
          pickerAppearance: 'dayOnly',
          displayFormat: 'MMM d, yyyy',
        },
      },
    },
    {
      name: 'maxRedemptions',
      type: 'number',
      label: 'Usage Limit',
      min: 1,
      admin: {
        description:
          'Optional. Maximum number of paid bookings that can use this code. Leave empty for unlimited.',
      },
    },
    {
      name: 'timesRedeemed',
      type: 'number',
      label: 'Times Used',
      defaultValue: 0,
      admin: {
        readOnly: true,
        description: 'Counted automatically when a booking using this code is paid.',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Internal Notes',
      admin: {
        description: 'Only visible to admins (e.g. who this code was given to).',
      },
    },
  ],
}
