/**
 * US phone normalization — identical rule to cms/src/lib/phone.ts:
 * strip formatting; accept 10 digits or 11 with a leading 1 (+1 country
 * code); return the bare 10-digit string, or null if invalid.
 */
export function normalizeUSPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return ten.length === 10 ? ten : null;
}

export const PHONE_ERROR =
  "Please enter a valid 10-digit phone number — with or without the +1 country code.";
