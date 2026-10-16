/**
 * US mailing address — website-side twin of cms/src/lib/mailing-address.ts.
 * Same shape, same validation rules; keep the two in sync.
 */

export const US_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" }, { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
];
export const US_STATE_CODES = new Set(US_STATES.map((s) => s.code));
export const ZIP_RE = /^\d{5}(-\d{4})?$/;

export interface MailingAddress {
  street?: string | null;
  street2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

/** Form field names used on the booking page. */
export const ADDRESS_FIELDS = {
  street: "addressStreet",
  street2: "addressStreet2",
  city: "addressCity",
  state: "addressState",
  zip: "addressZip",
} as const;

/**
 * Read the address block from the booking form and validate it as REQUIRED.
 * Returns the normalized address plus per-field errors keyed by form field name.
 */
export function readRequiredMailingAddress(formData: FormData): {
  address: MailingAddress;
  errors: Record<string, string>;
} {
  const get = (k: string, max: number) => ((formData.get(k) as string | null) ?? "").trim().slice(0, max);
  const address: MailingAddress = {
    street: get(ADDRESS_FIELDS.street, 200),
    street2: get(ADDRESS_FIELDS.street2, 100),
    city: get(ADDRESS_FIELDS.city, 100),
    state: get(ADDRESS_FIELDS.state, 2).toUpperCase(),
    zip: get(ADDRESS_FIELDS.zip, 10),
  };
  const errors: Record<string, string> = {};
  if (!address.street) errors[ADDRESS_FIELDS.street] = "Street address is required for this course.";
  if (!address.city) errors[ADDRESS_FIELDS.city] = "City is required.";
  if (!address.state) errors[ADDRESS_FIELDS.state] = "Please select a state.";
  else if (!US_STATE_CODES.has(address.state)) errors[ADDRESS_FIELDS.state] = "Please select a valid US state.";
  if (!address.zip) errors[ADDRESS_FIELDS.zip] = "ZIP code is required.";
  else if (!ZIP_RE.test(address.zip)) errors[ADDRESS_FIELDS.zip] = "Enter a 5-digit ZIP code (or ZIP+4).";
  return { address, errors };
}

export function isCompleteMailingAddress(a: MailingAddress | null | undefined): boolean {
  if (!a) return false;
  return Boolean(
    a.street?.trim() && a.city?.trim() &&
    a.state && US_STATE_CODES.has(a.state.trim().toUpperCase()) &&
    a.zip && ZIP_RE.test(a.zip.trim()),
  );
}

/** "123 Main St, Apt 4, Staten Island, NY 10309" — empty string when nothing entered. */
export function formatMailingAddress(a: MailingAddress | null | undefined): string {
  if (!a) return "";
  const street = a.street?.trim();
  const street2 = a.street2?.trim();
  const city = a.city?.trim();
  const stateZip = [a.state?.trim().toUpperCase(), a.zip?.trim()].filter(Boolean).join(" ");
  const cityStateZip = [city, stateZip].filter(Boolean).join(", ");
  return [street, street2, cityStateZip].filter(Boolean).join(", ");
}
