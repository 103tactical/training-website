import type { Field } from 'payload'

/**
 * ONE definition of a US mailing address for the whole CMS — the group field
 * used on Attendees, PendingBookings and Private Group Booking rows, plus the
 * validation and formatting every writer and reader shares.
 *
 * Addresses are OPTIONAL data everywhere; a Course's `requiresMailingAddress`
 * toggle makes them mandatory at booking time only (website checkout, admin
 * payment links, private-group processing, new admin-created bookings).
 * Existing records are never retro-validated. US-only by design, matching the
 * phone rule.
 */

export const US_STATES: { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
]
export const US_STATE_CODES = new Set(US_STATES.map((s) => s.code))
export const ZIP_RE = /^\d{5}(-\d{4})?$/

export interface MailingAddress {
  street?: string | null
  street2?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
}

/** Trim every part, uppercase the state. Returns null when nothing was entered. */
export function normalizeMailingAddress(input: unknown): MailingAddress | null {
  if (!input || typeof input !== 'object') return null
  const a = input as Record<string, unknown>
  const t = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const out: MailingAddress = {
    street: t(a.street),
    street2: t(a.street2),
    city: t(a.city),
    state: t(a.state).toUpperCase(),
    zip: t(a.zip),
  }
  if (!out.street && !out.street2 && !out.city && !out.state && !out.zip) return null
  return out
}

/** Human-readable reason the address is not usable, or null when complete. */
export function mailingAddressProblem(input: unknown): string | null {
  const a = normalizeMailingAddress(input)
  if (!a) return 'no address was entered'
  const missing: string[] = []
  if (!a.street) missing.push('street address')
  if (!a.city) missing.push('city')
  if (!a.state) missing.push('state')
  if (!a.zip) missing.push('ZIP code')
  if (missing.length) return `missing ${missing.join(', ')}`
  if (!US_STATE_CODES.has(a.state!)) return `"${a.state}" is not a US state code`
  if (!ZIP_RE.test(a.zip!)) return `"${a.zip}" is not a valid ZIP code (12345 or 12345-6789)`
  return null
}

export function isCompleteMailingAddress(input: unknown): boolean {
  return mailingAddressProblem(input) === null
}

/** "123 Main St, Apt 4, Staten Island, NY 10309" — empty string when nothing entered. */
export function formatMailingAddress(input: unknown): string {
  const a = normalizeMailingAddress(input)
  if (!a) return ''
  const cityStateZip = [a.city, [a.state, a.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return [a.street, a.street2, cityStateZip].filter(Boolean).join(', ')
}

// ── Field validators (optional fields — empty is fine, present must be valid) ─

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stateValidate = (value: any): true | string => {
  if (value == null || value === '') return true
  return US_STATE_CODES.has(String(value).trim().toUpperCase())
    ? true
    : 'Enter the 2-letter US state code (e.g. NY, NJ).'
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const zipValidate = (value: any): true | string => {
  if (value == null || value === '') return true
  return ZIP_RE.test(String(value).trim()) ? true : 'Enter a 5-digit ZIP code (or ZIP+4, e.g. 10309-1234).'
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const upperTrim = ({ value }: any) => (typeof value === 'string' ? value.trim().toUpperCase() : value)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const trim = ({ value }: any) => (typeof value === 'string' ? value.trim() : value)

/** The shared "Mailing Address" group field. */
export function mailingAddressGroup(description: string): Field {
  return {
    name: 'mailingAddress',
    type: 'group',
    label: 'Mailing Address',
    admin: { description },
    fields: [
      { name: 'street', type: 'text', label: 'Street Address', maxLength: 200, hooks: { beforeValidate: [trim] } },
      { name: 'street2', type: 'text', label: 'Apt / Suite / Unit', maxLength: 100, hooks: { beforeValidate: [trim] } },
      {
        type: 'row',
        fields: [
          { name: 'city', type: 'text', label: 'City', maxLength: 100, hooks: { beforeValidate: [trim] } },
          {
            name: 'state',
            type: 'text',
            label: 'State',
            maxLength: 2,
            validate: stateValidate,
            hooks: { beforeValidate: [upperTrim] },
            admin: { description: '2-letter code, e.g. NY' },
          },
          { name: 'zip', type: 'text', label: 'ZIP', maxLength: 10, validate: zipValidate, hooks: { beforeValidate: [trim] } },
        ],
      },
    ],
  }
}

/** Does this course require a mailing address to book? (null/unknown → false) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function courseRequiresMailingAddress(p: any, course: unknown, req?: unknown): Promise<boolean> {
  if (course && typeof course === 'object') {
    return Boolean((course as { requiresMailingAddress?: boolean }).requiresMailingAddress)
  }
  if (typeof course === 'number' || typeof course === 'string') {
    try {
      const doc = await p.findByID({ collection: 'courses', id: course, depth: 0, req })
      return Boolean(doc?.requiresMailingAddress)
    } catch {
      return false
    }
  }
  return false
}
