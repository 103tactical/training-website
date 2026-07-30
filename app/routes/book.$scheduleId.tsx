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
  useFetcher,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import { useEffect, useState } from "react";
import {
  getCourseScheduleById,
  createPendingBooking,
  findActivePendingBooking,
  updatePendingBooking,
  getECommerceSettings,
  validateDiscountCode,
  countAdminLinkHolds,
} from "~/lib/payload";
import type { CourseSchedule, Course, Instructor } from "~/lib/payload";
import { squareClient, SQUARE_LOCATION_ID, SQUARE_CONFIGURED } from "~/lib/square.server";
import { isScheduleBookable } from "~/lib/schedule.server";
import { normalizeUSPhone, PHONE_ERROR } from "~/lib/phone";

// ── Types ─────────────────────────────────────────────────────────────────────

type BookActionData = {
  errors: Record<string, string>;
  formError: string | null;
};

/** Response shape for the "apply discount code" fetcher submission */
type ApplyCodeData = {
  discount?: {
    code: string;
    label: string;
    discountAmount: number;   // dollars
    surchargeAmount: number;  // dollars, recomputed on the discounted price
    totalPrice: number;       // dollars
  };
  discountError?: string;
};

// ── Meta ─────────────────────────────────────────────────────────────────────

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const title = data?.courseName
    ? `Schedule: ${data.courseName} | 103 Tactical`
    : "Schedule a Session | 103 Tactical";
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
    timeZone: "UTC",
  });
}

function formatTime(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
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

  if (!isScheduleBookable(schedule)) {
    throw new Response("This session has already taken place", { status: 410 });
  }

  const course = schedule.course as Course;
  const instructor = schedule.instructor as Instructor | undefined;
  // Outstanding admin-sent payment links hold seats — they're promised
  const heldSeats = await countAdminLinkHolds(scheduleId);
  const remaining = schedule.maxSeats - (schedule.seatsBooked ?? 0) - heldSeats;

  const formattedSessions = (schedule.sessions ?? []).map((s: any) => ({
    id: s.id,
    dateText: formatDate(s.date),
    startTimeText: formatTime(s.startTime),
    endTimeText: formatTime(s.endTime),
    hasTime: !!(s.startTime || s.endTime),
  }));

  const basePrice = course?.price ?? 0;
  const ecommerceSettings = await getECommerceSettings();
  const surchargePercent = ecommerceSettings.payments?.creditCardSurchargePercent ?? 0;
  const fixedFeeDollars = (ecommerceSettings.payments?.creditCardFixedFeeCents ?? 0) / 100;
  // Pass-through formula accounting for both % and fixed fee components:
  // surcharge = (price + fixedFee) / (1 - rate%) - price
  // Ensures merchant fully recoups Square's fee structure (e.g. 2.9% + $0.30).
  const surchargeAmount = surchargePercent > 0
    ? Math.round(((basePrice + fixedFeeDollars) / (1 - surchargePercent / 100) - basePrice) * 100) / 100
    : 0;
  const totalPrice = basePrice + surchargeAmount;

  return json({
    scheduleId,
    courseName: course?.title ?? "Course",
    courseSlug: course?.slug ?? "",
    price: basePrice,
    surchargePercent,
    surchargeAmount,
    totalPrice,
    durationHours: course?.durationHours,
    durationDays: course?.durationDays,
    sessions: formattedSessions,
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

  // ── "Apply discount code" fetcher submission (no other fields required) ────
  if (formData.get("intent") === "apply-code") {
    const rawCode = (formData.get("discountCode") as string | null)?.trim().slice(0, 32) ?? "";
    if (!rawCode) {
      return json<ApplyCodeData>({ discountError: "Enter a discount code first." });
    }
    try {
      const schedule = await getCourseScheduleById(scheduleId);
      if (!schedule || !schedule.isActive || !isScheduleBookable(schedule)) {
        return json<ApplyCodeData>({ discountError: "This session is no longer available." });
      }
      const course = schedule.course as Course;
      const priceInCents = Math.round((course?.price ?? 0) * 100);
      const check = await validateDiscountCode(rawCode, Number(course?.id), priceInCents);
      if (!check.valid) {
        return json<ApplyCodeData>({ discountError: check.reason });
      }
      const ecommerceSettings = await getECommerceSettings();
      const surchargePercent = ecommerceSettings.payments?.creditCardSurchargePercent ?? 0;
      const fixedFeeCents = ecommerceSettings.payments?.creditCardFixedFeeCents ?? 0;
      const surchargeCents = surchargePercent > 0
        ? Math.round((check.discountedPriceCents + fixedFeeCents) / (1 - surchargePercent / 100)) - check.discountedPriceCents
        : 0;
      return json<ApplyCodeData>({
        discount: {
          code: check.code,
          label: check.label,
          discountAmount: check.discountCents / 100,
          surchargeAmount: surchargeCents / 100,
          totalPrice: (check.discountedPriceCents + surchargeCents) / 100,
        },
      });
    } catch (err) {
      console.error("[book] apply-code error:", err);
      return json<ApplyCodeData>({ discountError: "Could not check that code right now. Please try again." });
    }
  }

  const firstName = (formData.get("firstName") as string | null)?.trim().slice(0, 100) ?? "";
  const lastName  = (formData.get("lastName")  as string | null)?.trim().slice(0, 100) ?? "";
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const phone = (formData.get("phone") as string | null)?.trim() ?? "";

  // ── Validation ──────────────────────────────────────────────────────────────
  const errors: Record<string, string> = {};

  if (!firstName)           errors.firstName = "The attendee's first name is required.";
  if (!lastName)            errors.lastName  = "The attendee's last name is required.";

  if (!email)               errors.email     = "Email address is required.";
  else if (email.length > 254) errors.email  = "Email address is too long.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Please enter a valid email address.";

  // Phone is optional, but if provided it must be a valid US number
  // (10 digits, with or without the +1 country code). Stored as bare digits;
  // converted to E.164 for Square pre-population.
  const sanitizedPhone = phone ? normalizeUSPhone(phone) ?? "" : "";
  if (phone && !sanitizedPhone) errors.phone = PHONE_ERROR;
  const e164Phone = sanitizedPhone ? `+1${sanitizedPhone}` : undefined;

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
    if (!isScheduleBookable(schedule)) {
      return json<BookActionData>({ errors: {}, formError: "This session has already taken place and can no longer be booked." }, { status: 410 });
    }
    const heldSeats = await countAdminLinkHolds(scheduleId);
    const remaining = schedule.maxSeats - (schedule.seatsBooked ?? 0) - heldSeats;
    if (remaining <= 0) {
      return json<BookActionData>({ errors: {}, formError: "Sorry, this session just filled up." }, { status: 409 });
    }

    const course = schedule.course as Course;
    const priceInCents = Math.round((course?.price ?? 0) * 100);

    // ── Discount code (re-validated server-side — the applied UI state is
    // only a preview; this is the authoritative check) ──────────────────────
    const discountCodeInput = (formData.get("discountCode") as string | null)?.trim().slice(0, 32) ?? "";
    let discountCents = 0;
    let appliedCode: string | undefined;
    if (discountCodeInput) {
      const check = await validateDiscountCode(discountCodeInput, Number(course?.id), priceInCents);
      if (!check.valid) {
        return json<BookActionData>(
          { errors: {}, formError: `Discount code: ${check.reason} Remove the code or correct it, then try again.` },
          { status: 422 },
        );
      }
      discountCents = check.discountCents;
      appliedCode = check.code;
    }
    const discountedPriceCents = priceInCents - discountCents;

    const ecommerceSettings = await getECommerceSettings();
    const surchargePercent = ecommerceSettings.payments?.creditCardSurchargePercent ?? 0;
    const fixedFeeCents = ecommerceSettings.payments?.creditCardFixedFeeCents ?? 0;
    // Pass-through formula: (price + fixedFee) / (1 - rate%) - price
    // Fully recoups both the percentage and fixed components of Square's fee.
    // Computed on the DISCOUNTED price — the fee only covers money actually charged.
    const surchargeCents = surchargePercent > 0
      ? Math.round((discountedPriceCents + fixedFeeCents) / (1 - surchargePercent / 100)) - discountedPriceCents
      : 0;

    // ── Upsert PendingBooking ───────────────────────────────────────────────
    // If this email already has a pending record for this schedule (e.g. the
    // user hit back and resubmitted, or is returning later), refresh the token
    // and phone on the existing record instead of creating a duplicate.
    // A fresh token means a fresh Square payment link either way.
    const token = crypto.randomUUID().replace(/-/g, "");
    const scheduleIdInt = parseInt(scheduleId, 10);
    const existing = await findActivePendingBooking(email, scheduleIdInt);

    if (existing) {
      await updatePendingBooking(existing.id, {
        token,
        firstName,
        lastName,
        ...(sanitizedPhone ? { phone: sanitizedPhone } : {}),
        // Always overwrite — a resubmit may add, change, or remove the code
        discountCode: appliedCode ?? null,
        discountCents: appliedCode ? discountCents : null,
      });
    } else {
      await createPendingBooking({
        token,
        courseSchedule: scheduleIdInt,
        email,
        firstName,
        lastName,
        phone: sanitizedPhone || undefined,
        source: "website",
        ...(appliedCode ? { discountCode: appliedCode, discountCents } : {}),
      });
    }

    // ── Create Square Payment Link ──────────────────────────────────────────
    const siteUrl = process.env.PUBLIC_SITE_URL ?? "";
    const idempotencyKey = `book-${scheduleId}-${token}`;

    // Format session dates for Square note and metadata
    const sessionDateStr = (schedule.sessions ?? [])
      .filter((s: { date?: string }) => s.date)
      .map((s: { date?: string }) => {
        try {
          return new Date(s.date!).toLocaleDateString("en-US", {
            weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
          });
        } catch { return s.date!; }
      })
      .join(", ");

    const lineItemNote = [
      schedule.displayLabel ?? schedule.label ?? null,
      sessionDateStr || null,
    ].filter(Boolean).join(" — ");

    const response = await squareClient.checkout.paymentLinks.create({
      idempotencyKey,
      order: {
        locationId: SQUARE_LOCATION_ID,
        source: { name: '103 Tactical Website' },
        referenceId: token, // 32-char hex — webhook uses this to look up the PendingBooking
        // Metadata links every Square transaction back to our CMS records
        metadata: {
          pendingBookingToken: token,
          courseScheduleId:    String(scheduleId),
          courseTitle:         course?.title ?? "",
          sessionDates:        sessionDateStr,
          attendeeEmail:       email,
        },
        lineItems: [
          {
            name: course?.title ?? "Course Registration",
            quantity: "1",
            note: lineItemNote || undefined,
            basePriceMoney: {
              amount: BigInt(priceInCents),
              currency: "USD",
            },
          },
        ],
        ...(discountCents > 0 && appliedCode ? {
          discounts: [
            {
              name: `Discount (${appliedCode})`,
              type: "FIXED_AMOUNT" as const,
              amountMoney: { amount: BigInt(discountCents), currency: "USD" },
              scope: "ORDER" as const,
            },
          ],
        } : {}),
        ...(surchargeCents > 0 ? {
          serviceCharges: [
            {
              name: `Credit Card Processing Fee (${surchargePercent}%)`,
              amountMoney: {
                amount: BigInt(surchargeCents),
                currency: "USD",
              },
              calculationPhase: "SUBTOTAL_PHASE",
              taxable: false,
            },
          ],
        } : {}),
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
    courseName, courseSlug, price, surchargePercent, surchargeAmount, totalPrice,
    durationHours, durationDays, sessions, instructorName, displayLabel,
    remaining, full, squareConfigured,
  } = data;

  const errors = actionData?.errors ?? {};
  const formError = actionData?.formError ?? null;

  // ── Discount code (fetcher preview; server re-validates on final submit) ──
  const codeFetcher = useFetcher<ApplyCodeData>();
  const [codeInput, setCodeInput] = useState("");
  const [applied, setApplied] = useState<NonNullable<ApplyCodeData["discount"]> | null>(null);
  const applying = codeFetcher.state !== "idle";
  const discountError = !applied && codeFetcher.state === "idle" ? codeFetcher.data?.discountError : undefined;

  useEffect(() => {
    if (codeFetcher.state === "idle" && codeFetcher.data?.discount) {
      setApplied(codeFetcher.data.discount);
    }
  }, [codeFetcher.state, codeFetcher.data]);

  const applyCode = () => {
    if (!codeInput.trim() || applying) return;
    codeFetcher.submit(
      { intent: "apply-code", discountCode: codeInput.trim() },
      { method: "post" },
    );
  };
  const removeCode = () => {
    setApplied(null);
    setCodeInput("");
  };

  // Displayed totals: the applied discount overrides the loader's defaults
  const shownSurcharge = applied ? applied.surchargeAmount : surchargeAmount;
  const shownTotal = applied ? applied.totalPrice : totalPrice;

  // When the user clicks back from Square checkout, the browser may restore
  // this page from bfcache with the button frozen in "Preparing checkout…".
  // Reloading on pageshow with persisted=true gives them a clean form.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

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
            <h1 className="booking-summary__course">{courseName}</h1>
            {displayLabel && (
              <p className="booking-summary__label">{displayLabel}</p>
            )}
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
                <div className="booking-summary__dates course-detail__info-box">
                  {sessions.map((s, i) => (
                    <div key={s.id ?? i} className="booking-summary__session-block">
                      {sessions.length > 1 && (
                        <span className="booking-summary__day-num">Day {i + 1}</span>
                      )}
                      <span className="booking-summary__date-text">{s.dateText}</span>
                      {s.hasTime && (
                        <span className="booking-summary__time">
                          {s.startTimeText}
                          {s.startTimeText && s.endTimeText && " – "}
                          {s.endTimeText}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="booking-summary__meta-row course-detail__info-box">
              {(durationHours != null || durationDays != null) && (
                <div className="booking-summary__meta-item">
                  <span className="booking-summary__meta-key">Duration</span>
                  <span className="booking-summary__meta-val">
                    {[
                      durationHours != null ? `${durationHours}h` : null,
                      durationDays != null ? `${durationDays} day${durationDays !== 1 ? "s" : ""}` : null,
                    ].filter(Boolean).join(" · ")}
                  </span>
                </div>
              )}
              {instructorName && (
                <div className="booking-summary__meta-item">
                  <span className="booking-summary__meta-key">Instructor</span>
                  <span className="booking-summary__meta-val">{instructorName}</span>
                </div>
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
              <h2 className="booking-form__heading">Schedule Your Session</h2>
              <p className="booking-form__subtext">
                Tell us who will be attending, then you&apos;ll be taken to
                Square&apos;s secure checkout to complete payment. If you&apos;re
                booking for someone else, enter <strong>their</strong> details
                here — payment details come later.
              </p>

              {formError && (
                <div className="booking-form__error-banner" role="alert">
                  {formError}
                </div>
              )}

              <div className="booking-form__field">
                <label className="booking-form__label" htmlFor="firstName">
                  Attendee First Name <span className="booking-form__required">*</span>
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  maxLength={100}
                  autoComplete="given-name"
                  className={inputClass("firstName")}
                  aria-describedby={errors.firstName ? "firstName-error" : undefined}
                />
                {errors.firstName && (
                  <span id="firstName-error" className="booking-form__field-error">
                    {errors.firstName}
                  </span>
                )}
              </div>

              <div className="booking-form__field">
                <label className="booking-form__label" htmlFor="lastName">
                  Attendee Last Name <span className="booking-form__required">*</span>
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  maxLength={100}
                  autoComplete="family-name"
                  className={inputClass("lastName")}
                  aria-describedby={errors.lastName ? "lastName-error" : undefined}
                />
                {errors.lastName && (
                  <span id="lastName-error" className="booking-form__field-error">
                    {errors.lastName}
                  </span>
                )}
              </div>

              <div className="booking-form__field">
                <label className="booking-form__label" htmlFor="email">
                  Attendee Email Address <span className="booking-form__required">*</span>
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
                    The booking confirmation and any course forms will be sent here.
                  </span>
                )}
              </div>

              <div className="booking-form__field">
                <label className="booking-form__label" htmlFor="phone">
                  Attendee Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  maxLength={30}
                  autoComplete="tel"
                  className={inputClass("phone")}
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                />
                {errors.phone ? (
                  <span id="phone-error" className="booking-form__field-error">
                    {errors.phone}
                  </span>
                ) : (
                  <span className="booking-form__field-hint">
                    Used only for urgent session updates.
                  </span>
                )}
              </div>

              {/* ── Discount code ── */}
              <div className="booking-form__field booking-form__discount">
                <label className="booking-form__label" htmlFor="discountCodeInput">
                  Discount Code
                </label>
                {applied ? (
                  <div className="booking-form__discount-applied">
                    <span className="booking-form__discount-applied-text">
                      Code <strong>{applied.code}</strong> applied — {applied.label}
                    </span>
                    <button
                      type="button"
                      className="booking-form__discount-remove"
                      onClick={removeCode}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="booking-form__discount-row">
                    <input
                      id="discountCodeInput"
                      type="text"
                      maxLength={32}
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      className="booking-form__input booking-form__discount-input"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          applyCode();
                        }
                      }}
                      placeholder="Enter code"
                    />
                    <button
                      type="button"
                      className="btn btn--outline booking-form__discount-apply"
                      onClick={applyCode}
                      disabled={applying || !codeInput.trim()}
                    >
                      {applying ? "Checking…" : "Apply"}
                    </button>
                  </div>
                )}
                {discountError && (
                  <span className="booking-form__field-error">{discountError}</span>
                )}
              </div>
              {/* The APPLIED code travels with the booking submit; the server
                  re-validates it before creating the Square checkout. */}
              <input type="hidden" name="discountCode" value={applied?.code ?? ""} />

              {surchargePercent > 0 && (
                <div className="booking-form__cc-notice" role="note">
                  <span className="booking-form__cc-notice-title">Card processing fee</span>
                  <span className="booking-form__cc-notice-body">
                    A {surchargePercent}% processing fee applies to card payments.
                    This fee does not exceed our cost of acceptance.
                  </span>
                </div>
              )}

              {surchargePercent > 0 || applied ? (
                <div className="booking-form__summary-breakdown">
                  <div className="booking-form__summary-line booking-form__summary-line--sub">
                    <span>Course fee</span>
                    <span>${price.toLocaleString()}.00</span>
                  </div>
                  {applied && (
                    <div className="booking-form__summary-line booking-form__summary-line--sub booking-form__summary-line--discount">
                      <span>Discount ({applied.code})</span>
                      <span>−${applied.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {surchargePercent > 0 && (
                    <div className="booking-form__summary-line booking-form__summary-line--sub">
                      <span>Credit card processing ({surchargePercent}%)</span>
                      <span>${shownSurcharge.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="booking-form__summary-line booking-form__summary-line--total">
                    <span>Total due today</span>
                    <span className="booking-form__total">${shownTotal.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="booking-form__summary-line">
                  <span>Total due today</span>
                  <span className="booking-form__total">${price.toLocaleString()}.00</span>
                </div>
              )}

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
