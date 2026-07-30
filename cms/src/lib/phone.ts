/**
 * Shared US phone validation/normalization for every phone input in the CMS.
 * Rule: strip all formatting; accept exactly 10 digits, or 11 digits with a
 * leading 1 (i.e. the +1 country code); store the bare 10-digit string.
 * The website uses the identical rule (app/lib/phone.ts) so values arriving
 * over REST always pass.
 */

export function normalizeUSPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  return ten.length === 10 ? ten : null
}

export const PHONE_ERROR =
  'Enter a valid 10-digit phone number — with or without the +1 country code (e.g. 718-885-4353 or +1 718 885 4353).'

/** Field-level validate for OPTIONAL phone fields (empty is fine). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const optionalPhoneValidate = (val: any): true | string => {
  if (val == null || String(val).trim() === '') return true
  return normalizeUSPhone(String(val)) !== null ? true : PHONE_ERROR
}

/** Field-level validate for REQUIRED phone fields. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const requiredPhoneValidate = (val: any): true | string => {
  if (val == null || String(val).trim() === '') return 'Phone number is required.'
  return normalizeUSPhone(String(val)) !== null ? true : PHONE_ERROR
}

/** Field beforeValidate hook: normalize to the bare 10-digit form for storage. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const phoneBeforeValidate = ({ value }: any) => {
  if (value == null || String(value).trim() === '') return value
  return normalizeUSPhone(String(value)) ?? value
}
