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

export async function getSiteSettings() {
  return fetchPayload<SiteSettings>("/globals/site-settings?depth=1");
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
  lastName: string;
  email: string;
  phone?: string;
}): Promise<Attendee> {
  const secret = process.env.CMS_WRITE_SECRET;
  const res = await fetch(`${PAYLOAD_API_URL}/api/attendees`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(data),
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
  failureReason?: string;
  attemptedAt?: string;
}

/** Create a pending booking record (called by the booking form action). */
export async function createPendingBooking(data: {
  token: string;
  courseSchedule: string | number;
  email: string;
  phone?: string;
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
    "status" | "squareOrderId" | "squarePaymentId" | "amountPaidCents" | "failureReason" | "attemptedAt" | "token" | "phone"
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
  paymentReference?: string;
}): Promise<{ id: number }> {
  const secret = process.env.CMS_WRITE_SECRET;
  const res = await fetch(`${PAYLOAD_API_URL}/api/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(data),
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
  seo?: SeoFields & { title?: string }; // title = site name suffix
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
