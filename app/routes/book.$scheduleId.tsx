import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import {
  getCourseScheduleById,
  createPendingBooking,
} from "~/lib/payload";
import type { CourseSchedule, Course, Instructor } from "~/lib/payload";
import { squareClient, SQUARE_LOCATION_ID, SQUARE_CONFIGURED } from "~/lib/square.server";

// ── Types ─────────────────────────────────────────────────────────────────────

type BookActionData = {
  errors: Record<string, string>;
  formError: string | null;
};

// ── Meta ─────────────────────────────────────────────────────────────────────

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const title = data?.courseName
    ? `Book: ${data.courseName} | 103 Tactical`
    : "Book a Session | 103 Tactical";
  return [{ title }, { name: "robots", content: "noindex" }];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ── Loader ────────────────────────────────────────────────────────────────────

export async function loader({ params }: LoaderFunctionArgs) {
  const { scheduleId } = params;
  if (!scheduleId) throw new Response("Not found", { status: 404 });

  let schedule: CourseSchedule;
  try {
    schedule = await getCourseScheduleById(scheduleId);
  } catch {
    throw new Response("Session not found", { status: 404 });
  }

  if (!schedule || !schedule.isActive) {
    throw new Response("Session not available", { status: 404 });
  }

  const course = schedule.course as Course;
  const instructor = schedule.instructor as Instructor | undefined;
  const remaining = schedule.maxSeats - (schedule.seatsBooked ?? 0);

  return json({
    scheduleId,
    courseName: course?.title ?? "Course",
    courseSlug: course?.slug ?? "",
    price: course?.price ?? 0,
    durationHours: course?.durationHours,
    durationDays: course?.durationDays,
    sessions: schedule.sessions ?? [],
    instructorName: instructor?.name ?? null,
    displayLabel: schedule.displayLabel ?? schedule.label ?? null,
    maxSeats: schedule.maxSeats,
    seatsBooked: schedule.seatsBooked ?? 0,
    remaining,
    full: remaining <= 0,
    squareConfigured: SQUARE_CONFIGURED,
  });
}

// ── Action ────────────────────────────────────────────────────────────────────

export async function action({ request, params }: ActionFunctionArgs) {
  const { scheduleId } = params;
  if (!scheduleId) throw new Response("Not found", { status: 404 });

  const formData = await request.formData();
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const phone = (formData.get("phone") as string | null)?.trim() ?? "";

  // ── Validation ──────────────────────────────────────────────────────────────
  const errors: Record<string, string> = {};

  if (!email)               errors.email     = "Email address is required.";
  else if (email.length > 254) errors.email  = "Email address is too long.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Please enter a valid email address.";

  // Sanitize and convert phone to E.164 for Square pre-population
  const phoneDigits = phone.replace(/\D/g, "");
  const sanitizedPhone = phone.replace(/[^0-9\s().+\-x]/gi, "").slice(0, 30);
  const e164Phone =
    phoneDigits.length === 10 ? `+1${phoneDigits}` :
    phoneDigits.length === 11 && phoneDigits.startsWith("1") ? `+${phoneDigits}` :
    undefined;

  if (Object.keys(errors).length > 0) {
    return json<BookActionData>({ errors, formError: null }, { status: 422 });
  }

  if (!SQUARE_CONFIGURED || !squareClient) {
    return json<BookActionData>(
      { errors: {}, formError: "Online booking is not available right now. Please contact us directly." },
      { status: 503 },
    );
  }

  try {
    // ── Re-check seat availability ──────────────────────────────────────────
    const schedule = await getCourseScheduleById(scheduleId);
    if (!schedule || !schedule.isActive) {
      return json<BookActionData>({ errors: {}, formError: "This session is no longer available." }, { status: 410 });
    }
    const remaining = schedule.maxSeats - (schedule.seatsBooked ?? 0);
    if (remaining <= 0) {
      return json<BookActionData>({ errors: {}, formError: "Sorry, this session just filled up." }, { status: 409 });
    }

    const course = schedule.course as Course;
    const priceInCents = Math.round((course?.price ?? 0) * 100);

    // ── Create PendingBooking ───────────────────────────────────────────────
    // We do NOT create an Attendee here. The Attendee is created only after
    // Square confirms payment via webhook — using Square's verified name/email.
    // The token is a 32-char hex string embedded in the Square Order referenceId
    // so the webhook can look up this record.
    const token = crypto.randomUUID().replace(/-/g, "");
    await createPendingBooking({
      token,
      courseSchedule: scheduleId,
      email,
      phone: sanitizedPhone || undefined,
    });

    // ── Create Square Payment Link ──────────────────────────────────────────
    const siteUrl = process.env.PUBLIC_SITE_URL ?? "";
    const idempotencyKey = `book-${scheduleId}-${token}`;

    const response = await squareClient.checkout.paymentLinks.create({
      idempotencyKey,
      order: {
        locationId: SQUARE_LOCATION_ID,
        referenceId: token, // 32-char hex — webhook uses this to look up the PendingBooking
        lineItems: [
          {
            name: course?.title ?? "Course Registration",
            quantity: "1",
            note: schedule.displayLabel ?? schedule.label ?? undefined,
            basePriceMoney: {
              amount: BigInt(priceInCents),
              currency: "USD",
            },
          },
        ],
      },
      checkoutOptions: {
        redirectUrl: `${siteUrl}/booking-confirmation`,
        merchantSupportEmail: process.env.SQUARE_SUPPORT_EMAIL,
      },
      prePopulatedData: {
        buyerEmail: email,
        ...(e164Phone ? { buyerPhoneNumber: e164Phone } : {}),
      },
    });

    const checkoutUrl = response.paymentLink?.url;
    if (!checkoutUrl) {
      throw new Error("Square did not return a checkout URL");
    }

    return redirect(checkoutUrl);
  } catch (err) {
    console.error("[book] action error:", err);
    return json<BookActionData>(
      { errors: {}, formError: "Something went wrong creating your booking. Please try again or contact us." },
      { status: 500 },
    );
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BookSessionPage() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData() as BookActionData | undefined;
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";

  const {
    courseName, courseSlug, price, durationHours, durationDays,
    sessions, instructorName, displayLabel, remaining, full,
    squareConfigured,
  } = data;

  const errors = actionData?.errors ?? {};
  const formError = actionData?.formError ?? null;

  function inputClass(name: string) {
    return errors[name]
      ? "booking-form__input booking-form__input--error"
      : "booking-form__input";
  }

  return (
    <div className="booking-page">
      <div className="booking-page__inner container">

        {/* ── Session Summary ── */}
        <div className="booking-summary">
          <div className="booking-summary__header">
            <div>
              <h1 className="booking-summary__course">{courseName}</h1>
              {displayLabel && (
                <p className="booking-summary__label">{displayLabel}</p>
              )}
            </div>
            {price > 0 && (
              <div className="booking-summary__price">
                ${price.toLocaleString()}
              </div>
            )}
          </div>

          <div className="booking-summary__details">
            {sessions.length > 0 && (
              <div className="booking-summary__sessions">
                <span className="booking-summary__detail-label">
                  {sessions.length === 1 ? "Date" : "Dates"}
                </span>
                <div className="booking-summary__dates">
                  {sessions.map((s, i) => (
                    <div key={s.id ?? i} className="booking-summary__date-row">
                      {sessions.length > 1 && (
                        <span className="booking-summary__day-num">Day {i + 1}:</span>
                      )}
                      <span>{formatDate(s.date)}</span>
                      {(s.startTime || s.endTime) && (
                        <span className="booking-summary__time">
                          {s.startTime && formatTime(s.startTime)}
                          {s.startTime && s.endTime && " – "}
                          {s.endTime && formatTime(s.endTime)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="booking-summary__meta-row">
              {(durationHours != null || durationDays != null) && (
                <span className="booking-summary__meta-chip">
                  {durationHours != null && `${durationHours}h`}
                  {durationHours != null && durationDays != null && " · "}
                  {durationDays != null && `${durationDays} day${durationDays !== 1 ? "s" : ""}`}
                </span>
              )}
              {instructorName && (
                <span className="booking-summary__meta-chip">
                  Instructor: {instructorName}
                </span>
              )}
              <span className={`booking-summary__seats${full ? " booking-summary__seats--full" : ""}`}>
                {full
                  ? "Session Full"
                  : remaining === 1
                    ? "1 seat remaining"
                    : `${remaining} seats remaining`}
              </span>
            </div>
          </div>
        </div>

        {/* ── Booking Form ── */}
        <div className="booking-form-wrap">
          {full ? (
            <div className="booking-form__full-notice">
              <p>This session is fully booked.</p>
              <a href={`/courses/${courseSlug}/schedule`} className="btn btn--outline">
                ← See Other Sessions
              </a>
            </div>
          ) : !squareConfigured ? (
            <div className="booking-form__full-notice">
              <p>Online booking is not available at this time. Please contact us to register.</p>
              <a href="/contact" className="btn btn--outline">Contact Us</a>
            </div>
          ) : (
            <Form method="post" className="booking-form" noValidate>
              <h2 className="booking-form__heading">Reserve Your Spot</h2>
              <p className="booking-form__subtext">
                Enter your contact details below. You&apos;ll then be taken to
                Square&apos;s secure checkout to complete payment.
              </p>

              {formError && (
                <div className="booking-form__error-banner" role="alert">
                  {formError}
                </div>
              )}

              <div className="booking-form__field">
                <label className="booking-form__label" htmlFor="email">
                  Email Address <span className="booking-form__required">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  className={inputClass("email")}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email ? (
                  <span id="email-error" className="booking-form__field-error">
                    {errors.email}
                  </span>
                ) : (
                  <span className="booking-form__field-hint">
                    Your booking confirmation will be sent here.
                  </span>
                )}
              </div>

              <div className="booking-form__field">
                <label className="booking-form__label" htmlFor="phone">
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  maxLength={30}
                  autoComplete="tel"
                  className="booking-form__input"
                />
                <span className="booking-form__field-hint">
                  Used only for urgent session updates.
                </span>
              </div>

              <div className="booking-form__summary-line">
                <span>Total due today</span>
                <span className="booking-form__total">${price.toLocaleString()}.00</span>
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--lg booking-form__submit"
                disabled={submitting}
              >
                {submitting ? "Preparing checkout…" : "Continue to Payment →"}
              </button>

              <p className="booking-form__secure-note">
                Secured by Square. Your card details are never stored on this site.
              </p>
            </Form>
          )}
        </div>

      </div>
    </div>
  );
}
