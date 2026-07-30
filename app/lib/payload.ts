export const PAYLOAD_API_URL =
  typeof process !== "undefined" && process.env.PAYLOAD_API_URL
    ? process.env.PAYLOAD_API_URL
    : "https://training-cms.onrender.com";

export function resolveMediaUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith("http") ? url : `${PAYLOAD_API_URL}${url}`;
}


/** Fetch public Payload data (no auth required). */
export async function fetchPayload<T>(path: string): Promise<T> {
  const res = await fetch(`${PAYLOAD_API_URL}/api${path}`, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Payload fetch failed: ${res.status} ${res.statusText} (${path})`);
  }

  return res.json() as Promise<T>;
}

/**
 * Fetch private Payload data using the CMS_WRITE_SECRET bearer token.
 * Use for collections with restricted read access (Attendees, Bookings).
 */
async function fetchPayloadAuth<T>(path: string): Promise<T> {
  const secret = process.env.CMS_WRITE_SECRET;
  const res = await fetch(`${PAYLOAD_API_URL}/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Payload auth fetch failed: ${res.status} ${res.statusText} (${path})`);
  }

  return res.json() as Promise<T>;
}

let _siteSettingsCache: { data: SiteSettings; expiresAt: number } | null = null;
const SITE_SETTINGS_TTL_MS = 5 * 60 * 1000;

export async function getSiteSettings(): Promise<SiteSettings> {
  if (_siteSettingsCache && Date.now() < _siteSettingsCache.expiresAt) {
    return _siteSettingsCache.data;
  }
  try {
    const data = await fetchPayload<SiteSettings>("/globals/site-settings?depth=1");
    _siteSettingsCache = { data, expiresAt: Date.now() + SITE_SETTINGS_TTL_MS };
    return data;
  } catch (err) {
    console.warn("[payload] Could not fetch site-settings:", err);
    return _siteSettingsCache?.data ?? ({} as SiteSettings);
  }
}

export interface ECommerceSettings {
  payments?: {
    creditCardSurchargePercent?: number | null;
    creditCardFixedFeeCents?: number | null;
    /** Booking-page fee notice heading; empty → site default */
    surchargeNoticeHeading?: string | null;
    /** Booking-page fee notice body; {percent} is replaced with the live rate */
    surchargeNoticeBody?: string | null;
  };
}

let _eCommerceCache: { data: ECommerceSettings; expiresAt: number } | null = null;
const ECOMMERCE_TTL_MS = 5 * 60 * 1000;

export async function getECommerceSettings(): Promise<ECommerceSettings> {
  if (_eCommerceCache && Date.now() < _eCommerceCache.expiresAt) {
    return _eCommerceCache.data;
  }
  try {
    const data = await fetchPayload<ECommerceSettings>("/globals/e-commerce");
    _eCommerceCache = { data, expiresAt: Date.now() + ECOMMERCE_TTL_MS };
    return data;
  } catch (err) {
    console.warn("[payload] Could not fetch e-commerce settings:", err);
    return _eCommerceCache?.data ?? {};
  }
}

export async function getUtility() {
  return fetchPayload<Utility>("/globals/utility");
}

export async function getHomePage() {
  return fetchPayload<HomePage>("/globals/home-page?depth=3");
}

export async function getContactSettings() {
  return fetchPayload<ContactSettings>("/globals/contact-settings?depth=2");
}

export async function getCourses() {
  return fetchPayload<{ docs: Course[] }>("/courses?where[isActive][equals]=true&sort=displayOrder");
}

export async function getCourseGroup(id: string) {
  return fetchPayload<CourseGroup>(`/course-groups/${id}?depth=2`);
}

export async function getCoursesPage() {
  return fetchPayload<CoursesPage>("/globals/courses-page?depth=3");
}

export async function getApplicationsPage() {
  return fetchPayload<ApplicationsPage>("/globals/applications-page?depth=2");
}

export async function getStorePage() {
  return fetchPayload<StorePage>("/globals/store-page?depth=2");
}

export async function getAllCourses() {
  return fetchPayload<{ docs: Course[] }>("/courses?limit=100&depth=1&sort=title");
}

export async function getCourseBySlug(slug: string) {
  return fetchPayload<{ docs: Course[] }>(
    `/courses?where[slug][equals]=${encodeURIComponent(slug)}&depth=2&limit=1`
  );
}

export async function getCourseSchedules(courseId: string) {
  return fetchPayload<{ docs: CourseSchedule[] }>(
    `/course-schedules?where[course][equals]=${encodeURIComponent(courseId)}&where[isActive][equals]=true&depth=1&limit=100&sort=createdAt`
  );
}

export async function getCourseScheduleById(id: string) {
  return fetchPayload<CourseSchedule>(`/course-schedules/${id}?depth=2`);
}

/** Find an attendee by email address. Returns null if none found. */
export async function findAttendeeByEmail(email: string): Promise<Attendee | null> {
  const res = await fetchPayloadAuth<{ docs: Attendee[] }>(
    `/attendees?where[email][equals]=${encodeURIComponent(email)}&limit=1`
  );
  return res.docs[0] ?? null;
}

/**
 * Create a new Attendee record via the Payload REST API.
 * Requires CMS_WRITE_SECRET — used by the webhook handler only.
 */
export async function createAttendee(data: {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
}): Promise<Attendee> {
  const secret = process.env.CMS_WRITE_SECRET;
  // Strip empty-string lastName so Payload doesn't receive "" for an optional field
  const payload = { ...data };
  if (!payload.lastName) delete payload.lastName;
  const res = await fetch(`${PAYLOAD_API_URL}/api/attendees`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`createAttendee failed: ${res.status} ${body}`);
  }
  const json = await res.json();
  return json.doc ?? json;
}

// ── Pending Bookings ───────────────────────────────────────────────────────────

export interface PendingBooking {
  id: number;
  token: string;
  courseSchedule: string | number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status: "pending" | "completed" | "failed" | "expired";
  squareOrderId?: string;
  squarePaymentId?: string;
  amountPaidCents?: number;
  discountCode?: string | null;
  discountCents?: number | null;
  failureReason?: string;
  attemptedAt?: string;
}

/** Create a pending booking record (called by the booking form action). */
export async function createPendingBooking(data: {
  token: string;
  courseSchedule: string | number;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  discountCode?: string;
  discountCents?: number;
  source?: "website" | "admin-link";
}): Promise<PendingBooking> {
  const secret = process.env.CMS_WRITE_SECRET;
  const res = await fetch(`${PAYLOAD_API_URL}/api/pending-bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`createPendingBooking failed: ${res.status} ${body}`);
  }
  const json = await res.json();
  return json.doc ?? json;
}

/**
 * Find an active (status=pending) pending booking for a given email + schedule.
 * Used to avoid creating duplicate pending records on resubmit.
 */
export async function findActivePendingBooking(
  email: string,
  courseScheduleId: number,
): Promise<PendingBooking | null> {
  const res = await fetchPayloadAuth<{ docs: PendingBooking[] }>(
    `/pending-bookings?where[email][equals]=${encodeURIComponent(email)}&where[courseSchedule][equals]=${courseScheduleId}&where[status][equals]=pending&limit=1`
  );
  return res.docs[0] ?? null;
}

/**
 * Update fields on an existing attendee (used by the webhook to backfill
 * EMPTY fields from the pending-booking snapshot — never to overwrite).
 */
export async function updateAttendee(
  id: number,
  data: Partial<Pick<Attendee, "firstName" | "lastName" | "phone">>,
): Promise<void> {
  const secret = process.env.CMS_WRITE_SECRET;
  const res = await fetch(`${PAYLOAD_API_URL}/api/attendees/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`updateAttendee failed: ${res.status} ${body}`);
  }
}

/**
 * Count outstanding ADMIN-sent payment links for a schedule. Each one holds
 * a seat in the website's availability math (the person was promised a spot;
 * they just haven't paid yet). Website-checkout pendings hold nothing.
 * Fails open (returns 0) — an error here must never block bookings.
 */
export async function countAdminLinkHolds(scheduleId: number | string): Promise<number> {
  try {
    const res = await fetchPayloadAuth<{ totalDocs: number }>(
      `/pending-bookings?where[courseSchedule][equals]=${scheduleId}&where[status][equals]=pending&where[source][equals]=admin-link&limit=1&depth=0`
    );
    return res.totalDocs ?? 0;
  } catch (err) {
    console.warn("[payload] countAdminLinkHolds failed:", err);
    return 0;
  }
}

/** Look up a pending booking by its unique token (used in the webhook). */
export async function findPendingBookingByToken(
  token: string,
): Promise<PendingBooking | null> {
  const res = await fetchPayloadAuth<{ docs: PendingBooking[] }>(
    `/pending-bookings?where[token][equals]=${encodeURIComponent(token)}&depth=0&limit=1`
  );
  return res.docs[0] ?? null;
}

/** Update a pending booking's status, Square payment fields, or token/phone. */
export async function updatePendingBooking(
  id: number,
  data: Partial<Pick<
    PendingBooking,
    "status" | "squareOrderId" | "squarePaymentId" | "amountPaidCents" | "failureReason" | "attemptedAt" | "token" | "phone" | "firstName" | "lastName" | "discountCode" | "discountCents"
  >>,
): Promise<void> {
  const secret = process.env.CMS_WRITE_SECRET;
  const res = await fetch(`${PAYLOAD_API_URL}/api/pending-bookings/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`updatePendingBooking failed: ${res.status} ${body}`);
  }
}

/**
 * Mark all 'pending' records as 'expired' when the first session day of the
 * linked course schedule has arrived or passed. A pending booking is no longer
 * actionable once the course has started.
 * Called by the cleanup cron endpoint.
 * Returns the list of expired record IDs.
 */
export async function expireStalePendingBookings(): Promise<number[]> {
  // Fetch all pending bookings with schedule data populated (depth=1)
  const res = await fetchPayloadAuth<{ docs: any[] }>(
    `/pending-bookings?where[status][equals]=pending&depth=1&limit=200`
  );
  const all = res.docs ?? [];
  if (all.length === 0) return [];

  // Today's date at midnight UTC — compare date strings only, no time component
  const todayStr = new Date().toISOString().slice(0, 10);

  const toExpire = all.filter((booking) => {
    const schedule = booking.courseSchedule;
    if (!schedule || typeof schedule !== "object") return false;
    const sessions: { date?: string }[] = schedule.sessions ?? [];
    if (sessions.length === 0) return false;
    // Sort ascending and take the first session date
    const firstDate = sessions
      .map((s) => s.date ?? "")
      .filter(Boolean)
      .sort()[0];
    // Expire if the first session day is today or in the past
    return firstDate <= todayStr;
  });

  if (toExpire.length === 0) return [];

  const secret = process.env.CMS_WRITE_SECRET;
  await Promise.all(
    toExpire.map((rec) =>
      fetch(`${PAYLOAD_API_URL}/api/pending-bookings/${rec.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify({ status: "expired" }),
      }),
    ),
  );

  return toExpire.map((r) => r.id);
}

/**
 * Create a Booking record via the Payload REST API.
 * Requires CMS_WRITE_SECRET.
 */
export async function createBookingRecord(data: {
  attendee: string | number;
  course: string | number;
  courseSchedule: string | number;
  status: "confirmed" | "waitlisted" | "cancelled";
  squareOrderId?: string;
  squarePaymentId?: string;
  amountPaidCents?: number;
  paymentMethod?: string;
  paymentReference?: string;
  discountCode?: string;
  discountCents?: number;
}): Promise<{ id: number }> {
  const secret = process.env.CMS_WRITE_SECRET;
  // Payload's REST relationship validation requires numeric IDs — coerce here
  // so callers don't need to worry about string vs number.
  const body = {
    ...data,
    attendee: Number(data.attendee),
    course: Number(data.course),
    courseSchedule: Number(data.courseSchedule),
  };
  const res = await fetch(`${PAYLOAD_API_URL}/api/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`createBookingRecord failed: ${res.status} ${body}`);
  }
  const json = await res.json();
  return json.doc ?? json;
}

export interface BookingRecord {
  id: number;
  status: string;
  amountPaidCents?: number;
  attendee?: { id: number; firstName: string; lastName: string; email: string } | null;
  course?: { id: string; title: string } | null;
}

/**
 * After a payment-link attendee pays, mark their row in the Private Group
 * Booking as 'paid'. Non-fatal — the booking already exists before this runs.
 */
export async function markPrivateGroupAttendeePaid(
  email: string,
  scheduleId: string,
): Promise<void> {
  const secret = process.env.CMS_WRITE_SECRET;
  try {
    await fetch(`${PAYLOAD_API_URL}/api/private-group-bookings/mark-attendee-paid`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({ email, scheduleId }),
    });
  } catch (err) {
    // Non-fatal — log and move on
    console.error("[payload] markPrivateGroupAttendeePaid failed:", err);
  }
}

// ── Discount codes ────────────────────────────────────────────────────────────

export type DiscountCheck =
  | {
      valid: true;
      code: string;
      discountCents: number;
      discountedPriceCents: number;
      label: string;
    }
  | { valid: false; reason: string };

/**
 * Validate a discount code against the CMS (the single source of truth for
 * discount rules). Fails closed: any error → code treated as invalid.
 */
/**
 * Publicly advertised discount codes ("Show on Website" in the CMS).
 * Used to display crossed-out course prices and to auto-apply the code on
 * the booking page. Fails quiet (empty list) — advertising is optional,
 * checkout always re-validates authoritatively.
 */
export interface FeaturedDiscount {
  code: string;
  discountType: "percent" | "fixed";
  percentOff: number | null;
  amountOffCents: number | null;
  appliesTo: "all" | "specific";
  courseIds: number[];
}

let featuredDiscountsCache: { at: number; codes: FeaturedDiscount[] } | null = null;
const FEATURED_CACHE_MS = 5 * 60 * 1000;

export async function getFeaturedDiscounts(): Promise<FeaturedDiscount[]> {
  if (featuredDiscountsCache && Date.now() - featuredDiscountsCache.at < FEATURED_CACHE_MS) {
    return featuredDiscountsCache.codes;
  }
  try {
    const res = await fetchPayload<{ codes: FeaturedDiscount[] }>("/discount-codes/featured");
    featuredDiscountsCache = { at: Date.now(), codes: Array.isArray(res.codes) ? res.codes : [] };
    return featuredDiscountsCache.codes;
  } catch {
    return featuredDiscountsCache?.codes ?? [];
  }
}

export interface CourseDisplayDiscount {
  code: string;
  /** Price after discount, in dollars */
  discountedPrice: number;
}

/**
 * The advertised discount to display for a course, or null. Mirrors the
 * server's discount math (fixed amounts clamp to the price; totals below
 * Square's $1 minimum are never advertised because checkout would refuse
 * them). First applicable featured code wins.
 */
export function courseDisplayDiscount(
  discounts: FeaturedDiscount[],
  course: { id: string | number; price?: number },
): CourseDisplayDiscount | null {
  const price = course.price;
  if (price == null || price <= 0) return null;
  const priceCents = Math.round(price * 100);
  for (const d of discounts) {
    if (d.appliesTo === "specific" && !d.courseIds.includes(Number(course.id))) continue;
    let offCents = 0;
    if (d.discountType === "fixed") {
      offCents = Math.min(Math.round(d.amountOffCents ?? 0), priceCents);
    } else {
      const pct = d.percentOff ?? 0;
      if (pct > 0 && pct <= 100) offCents = Math.round((priceCents * pct) / 100);
    }
    if (offCents <= 0) continue;
    const discountedCents = priceCents - offCents;
    if (discountedCents < 100) continue;
    return { code: d.code, discountedPrice: discountedCents / 100 };
  }
  return null;
}

export async function validateDiscountCode(
  code: string,
  courseId: number,
  priceInCents: number,
): Promise<DiscountCheck> {
  const secret = process.env.CMS_WRITE_SECRET;
  try {
    const res = await fetch(`${PAYLOAD_API_URL}/api/discount-codes/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({ code, courseId, priceInCents }),
    });
    if (!res.ok) {
      console.error(`[payload] validateDiscountCode HTTP ${res.status}`);
      return { valid: false, reason: "Could not check that code right now. Please try again." };
    }
    return (await res.json()) as DiscountCheck;
  } catch (err) {
    console.error("[payload] validateDiscountCode failed:", err);
    return { valid: false, reason: "Could not check that code right now. Please try again." };
  }
}

/**
 * Count a successful redemption against a code (called by the payment
 * webhook AFTER the booking exists). Non-fatal — never throws.
 */
export async function redeemDiscountCode(code: string): Promise<void> {
  const secret = process.env.CMS_WRITE_SECRET;
  try {
    await fetch(`${PAYLOAD_API_URL}/api/discount-codes/redeem`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({ code }),
    });
  } catch (err) {
    console.error("[payload] redeemDiscountCode failed:", err);
  }
}

/** Find a booking by its Square Order ID (depth=2 to populate attendee + course) */
export async function findBookingBySquareOrderId(orderId: string): Promise<BookingRecord | null> {
  const res = await fetchPayloadAuth<{ docs: BookingRecord[] }>(
    `/bookings?where[squareOrderId][equals]=${encodeURIComponent(orderId)}&depth=2&limit=1`
  );
  return res.docs[0] ?? null;
}

/** Update booking status via the Payload REST API */
export async function updateBookingStatus(
  bookingId: number,
  status: "confirmed" | "waitlisted" | "cancelled",
): Promise<void> {
  const secret = process.env.CMS_WRITE_SECRET;
  const res = await fetch(`${PAYLOAD_API_URL}/api/bookings/${bookingId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`updateBookingStatus failed: ${res.status} ${body}`);
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface SeoFields {
  title?: string;
  description?: string;
  ogImage?: { url: string; alt?: string };
}

export interface Utility {
  carouselDelay?: "off" | "4" | "6" | "8" | "10";
}

export interface ContactSettings {
  heroImage?: { url: string; alt?: string };
  topics?: { label: string }[];
  seo?: SeoFields;
}

export interface SiteSettings {
  logoHeaderStackedColor?: { url: string; alt: string };
  logoHeaderStackedWhite?: { url: string; alt: string };
  logoHeaderWideColor?: { url: string; alt: string };
  logoHeaderWideWhite?: { url: string; alt: string };
  logoFooter?: { url: string; alt: string };
  nav: { label: string; url: string; openInNewTab: boolean }[];
  contact: {
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
  };
  social: { platform: string; url: string }[];
  copyright?: string;
  seo?: SeoFields & { title?: string };
}

export interface HighlightCalloutItem {
  id: string;
  backgroundImage?: { url: string; alt?: string };
  backgroundColor?: "blue" | "red" | "grey" | "white";
  title: string;
  subtext: string;
  button?: { label?: string; url?: string; openInNewTab?: boolean };
}

export interface TestimonialItem {
  id: string;
  quote: string;
  name: string;
  context?: string;
}

export interface HomePage {
  websiteHeadlineSection?: { headline?: string };
  featured: FeaturedSlide[];
  featuredCoursesSection?: { courseGroup?: CourseGroup | string };
  highlightCallouts?: {
    oddItemPlacement?: "first" | "last";
    items?: HighlightCalloutItem[];
  };
  testimonialsSection?: {
    heading?: string;
    items?: TestimonialItem[];
  };
  whyChoose: {
    heading: string;
    items: {
      icon?: string;
      title: string;
      description?: string;
      bullets?: { item: string }[];
    }[];
  };
  badgesSection?: {
    heading?: string;
    badges: Badge[];
  };
  seo?: SeoFields;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  thumbnail?: { url: string; alt: string };
  socialShareImage?: { url: string; alt?: string };
  seoDescription?: string;
  summary?: { item: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  description?: any; // Lexical rich-text JSON
  durationHours?: number;
  durationDays?: number;
  price?: number;
  isActive: boolean;
  /** Optional enrollment email content — set by admin on the Course record */
  enrollmentMessage?: string;
  enrollmentFile?: { url: string; filename?: string; mimeType?: string };
}

export interface CoursesPage {
  heroImage?: { url: string; alt?: string };
  header?: { title?: string; subtext?: string };
  featuredCourse?: {
    enabled?: boolean;
    eyebrow?: string;
    heading?: string;
    body?: string;
    image?: { url: string; alt?: string };
    badge?: string;
    buttonLabel?: string;
    linkType?: "detail" | "schedule" | "custom";
    course?: Course | string | null;
    customUrl?: string;
  };
  courseGroups?: {
    id: string;
    group: CourseGroup;
  }[];
  seo?: SeoFields;
}

export interface ApplicationsPage {
  heroImage?: { url: string; alt?: string };
  header?: { title?: string; subtext?: string };
  seo?: SeoFields;
}

export interface StoreProduct {
  id: string;
  image?: { url: string; alt?: string };
  badge?: string;
  brand?: string;
  name: string;
  caliber?: string;
  description?: string;
  price?: number;
}

export interface StorePage {
  heroImage?: { url: string; alt?: string };
  header?: { title?: string; subtext?: string };
  showPrices?: boolean;
  featuredProduct?: {
    heading?: string;
  } & Omit<StoreProduct, "id">;
  pistolsSection?: { heading?: string; products?: StoreProduct[] };
  riflesSection?: { heading?: string; products?: StoreProduct[] };
  shotgunsSection?: { heading?: string; products?: StoreProduct[] };
  accessoriesSection?: { heading?: string; items?: StoreProduct[] };
  visitCta?: { heading?: string; subtext?: string; directionsUrl?: string };
  seo?: SeoFields;
}

export interface CourseGroup {
  id: string;
  title: string;
  courses?: {
    id: string;
    course: Course;
  }[];
}

export interface Badge {
  id: string;
  name: string;
  image: { url: string; alt?: string };
  url: string;
}

export interface CourseSession {
  id: string;
  date?: string;       // ISO timestamp (dayOnly picker)
  startTime?: string;  // ISO timestamp (timeOnly picker)
  endTime?: string;    // ISO timestamp (timeOnly picker)
}

export interface Attendee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface Instructor {
  id: string;
  name: string;
  title?: string;
  photo?: { url: string; alt?: string };
}

export interface CourseSchedule {
  id: string;
  course: Course | string;
  label?: string;
  displayLabel?: string;
  instructor?: Instructor | string;
  sessions?: CourseSession[];
  maxSeats: number;
  seatsBooked?: number;
  isActive: boolean;
}

export interface FeaturedSlide {
  slideType: "image" | "image-text" | "video";
  wideImage?: { url: string; alt: string };
  wideVideo?: { url: string };
  wideVideoPreview?: { url: string; alt?: string };
  verticalImage?: { url: string; alt: string };
  verticalVideo?: { url: string };
  verticalVideoPreview?: { url: string; alt?: string };
  heading?: string;
  subtext?: string;
  button?: { label?: string; url?: string; openInNewTab?: boolean };
}
