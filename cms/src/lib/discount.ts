/**
 * Discount code validation & redemption — the single source of truth.
 *
 * Both consumers of discount codes run through here:
 *   - the public website booking form (via the /api/discount-codes/validate
 *     and /redeem endpoints defined on the DiscountCodes collection)
 *   - the CMS "Send Payment Link" tool (calls validateDiscountCode directly)
 *
 * Rules:
 *   - the discount comes off the COURSE PRICE first; the card surcharge is
 *     then computed on the discounted amount (never on money not charged)
 *   - a code must be Active, unexpired (valid through its expiry day, ET),
 *     under its redemption cap, and applicable to the course being booked
 *   - the discounted price may not drop below $1.00 — Square's payment-link
 *     minimum. Free seats are handled by manual bookings, not codes.
 *   - redemption is counted on successful PAYMENT (the webhook), not on
 *     link creation, so abandoned checkouts never burn a use
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPayload = any

export interface DiscountValidationOk {
  valid: true
  codeId: number
  /** Normalized (uppercased) code as stored */
  code: string
  /** Amount off the course price, in cents */
  discountCents: number
  /** Course price after discount, in cents */
  discountedPriceCents: number
  /** Human label for receipts/emails, e.g. "10% off" or "$25.00 off" */
  label: string
}

export interface DiscountValidationFail {
  valid: false
  /** Customer-safe reason ("code not found" and "code inactive" read the same) */
  reason: string
}

export type DiscountValidation = DiscountValidationOk | DiscountValidationFail

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

/** Today's calendar day in Eastern Time, as YYYY-MM-DD */
function todayET(): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/New_York',
  }).format(new Date())
}

const GENERIC_INVALID = 'That code is not valid.'

export async function validateDiscountCode(args: {
  payload: AnyPayload
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req?: any
  code: string
  courseId: number
  priceInCents: number
}): Promise<DiscountValidation> {
  const { payload, req, courseId, priceInCents } = args
  const code = normalizeCode(args.code)

  if (!code) return { valid: false, reason: GENERIC_INVALID }
  if (!courseId || priceInCents <= 0) return { valid: false, reason: GENERIC_INVALID }

  const result = await payload.find({
    collection: 'discount-codes',
    where: { code: { equals: code } },
    limit: 1,
    depth: 0,
    ...(req ? { req } : {}),
  })
  const doc = result.docs[0]

  // Not found and inactive intentionally read the same to the customer
  if (!doc || doc.active === false) return { valid: false, reason: GENERIC_INVALID }

  // Expiry: valid through the whole expiry day, Eastern Time
  if (doc.expiresAt) {
    const expiryDay = String(doc.expiresAt).slice(0, 10)
    if (expiryDay < todayET()) {
      return { valid: false, reason: 'That code has expired.' }
    }
  }

  // Redemption cap
  if (typeof doc.maxRedemptions === 'number' && doc.maxRedemptions > 0) {
    const used = typeof doc.timesRedeemed === 'number' ? doc.timesRedeemed : 0
    if (used >= doc.maxRedemptions) {
      return { valid: false, reason: 'That code has reached its usage limit.' }
    }
  }

  // Course scope
  if (doc.appliesTo === 'specific') {
    const ids: number[] = (Array.isArray(doc.courses) ? doc.courses : [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((c: any) => (typeof c === 'object' && c !== null ? Number(c.id) : Number(c)))
      .filter((n: number) => !isNaN(n))
    if (!ids.includes(Number(courseId))) {
      return { valid: false, reason: 'That code does not apply to this course.' }
    }
  }

  // Amount
  let discountCents = 0
  let label = ''
  if (doc.discountType === 'fixed') {
    const off = typeof doc.amountOffCents === 'number' ? Math.round(doc.amountOffCents) : 0
    if (off <= 0) return { valid: false, reason: GENERIC_INVALID }
    discountCents = Math.min(off, priceInCents)
    label = `$${(off / 100).toFixed(2)} off`
  } else {
    const pct = typeof doc.percentOff === 'number' ? doc.percentOff : 0
    if (pct <= 0 || pct > 100) return { valid: false, reason: GENERIC_INVALID }
    discountCents = Math.round((priceInCents * pct) / 100)
    label = `${pct}% off`
  }

  const discountedPriceCents = priceInCents - discountCents

  // Square payment links cannot process totals under $1.00
  if (discountedPriceCents < 100) {
    return {
      valid: false,
      reason: 'This code cannot be applied to this course online. Please contact us to complete your registration.',
    }
  }

  return { valid: true, codeId: doc.id, code, discountCents, discountedPriceCents, label }
}

/**
 * Count one successful redemption against a code.
 * Best-effort: called by the payment webhook AFTER the booking exists, so a
 * failure here must never fail the booking — callers should treat errors as
 * non-fatal (the worst case is an undercounted stat, surfaced in the CMS).
 */
export async function redeemDiscountCode(args: {
  payload: AnyPayload
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req?: any
  code: string
}): Promise<boolean> {
  const { payload, req } = args
  const code = normalizeCode(args.code)
  if (!code) return false

  const result = await payload.find({
    collection: 'discount-codes',
    where: { code: { equals: code } },
    limit: 1,
    depth: 0,
    ...(req ? { req } : {}),
  })
  const doc = result.docs[0]
  if (!doc) return false

  const used = typeof doc.timesRedeemed === 'number' ? doc.timesRedeemed : 0
  await payload.update({
    collection: 'discount-codes',
    id: doc.id,
    data: { timesRedeemed: used + 1 },
    ...(req ? { req } : {}),
  })
  return true
}
