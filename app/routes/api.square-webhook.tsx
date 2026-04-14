/**
 * Square webhook receiver.
 *
 * Square POSTs to this endpoint for every subscribed event.
 * We verify the HMAC-SHA256 signature, then act on:
 *
 *   payment.updated  (status → COMPLETED)
 *     1. Look up the PendingBooking by the Order's referenceId (token)
 *     2. Store Square IDs on the PendingBooking
 *     3. Find or create the Attendee from Square's verified cardholder name + email
 *     4. Create the confirmed Booking
 *     5. Mark PendingBooking as completed (or failed, with reason)
 *
 *   refund.updated   (status → COMPLETED)
 *     → Find the Booking by squareOrderId and mark it cancelled
 *       (seat adjustment + waitlist promotion run via the CMS afterChange hook)
 *
 * We always respond 200 quickly — Square retries on non-2xx.
 * Internal errors are logged and stored on the PendingBooking for admin review.
 */
import { type ActionFunctionArgs } from "@remix-run/node";
import {
  squareClient,
  verifySquareWebhook,
} from "~/lib/square.server";
import {
  getCourseScheduleById,
  findBookingBySquareOrderId,
  createBookingRecord,
  updateBookingStatus,
  findAttendeeByEmail,
  createAttendee,
  findPendingBookingByToken,
  updatePendingBooking,
  resolveMediaUrl,
} from "~/lib/payload";
import type { Course } from "~/lib/payload";
import {
  formatCents,
  formatSessionDates,
  sendEnrollmentEmail,
  sendBookingConfirmationEmail,
  sendCancellationEmail,
  sendAdminBookingNotification,
  sendAdminBookingFailureAlert,
  sendAdminCancellationAlert,
} from "~/lib/email.server";

export async function action({ request }: ActionFunctionArgs) {
  const rawBody = await request.text();

  // ── Signature verification ────────────────────────────────────────────────
  const sigKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const isSandbox = process.env.SQUARE_ENVIRONMENT === "sandbox";

  if (sigKey) {
    const sigHeader = request.headers.get("x-square-hmacsha256-signature") ?? "";
    const webhookUrl = `${process.env.PUBLIC_SITE_URL ?? ""}/api/square-webhook`;
    const valid = await verifySquareWebhook(rawBody, sigHeader, webhookUrl);
    if (!valid) {
      console.warn("[webhook] Invalid Square signature — request rejected");
      return new Response("Unauthorized", { status: 401 });
    }
  } else if (!isSandbox) {
    console.error("[webhook] SQUARE_WEBHOOK_SIGNATURE_KEY not set in production — rejecting all requests");
    return new Response("Service Unavailable", { status: 503 });
  } else {
    console.warn("[webhook] Signature check skipped (sandbox dev mode)");
  }

  // ── Parse event ───────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: Record<string, any>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    console.warn("[webhook] Could not parse JSON body");
    return new Response("OK", { status: 200 });
  }

  const eventType = event.type as string | undefined;
  console.log(`[webhook] Received event: ${eventType}`);

  try {
    if (eventType === "payment.updated") {
      await handlePaymentUpdated(event);
    } else if (eventType === "refund.updated") {
      await handleRefundUpdated(event);
    }
  } catch (err) {
    console.error("[webhook] Handler error:", err);
  }

  return new Response("OK", { status: 200 });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Parse "John Smith" or "JOHN SMITH" into { firstName, lastName }.
 * Falls back to the full string in firstName if no space is found.
 */
function parseCardholderName(name: string): { firstName: string; lastName: string } {
  const normalized = name
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  const spaceIdx = normalized.indexOf(" ");
  if (spaceIdx === -1) return { firstName: normalized, lastName: "" };
  return {
    firstName: normalized.slice(0, spaceIdx),
    lastName: normalized.slice(spaceIdx + 1),
  };
}

// ── Payment handler ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePaymentUpdated(event: Record<string, any>) {
  const payment = event?.data?.object?.payment;
  if (!payment || payment.status !== "COMPLETED") return;

  const paymentId: string = payment.id;
  const orderId: string   = payment.order_id;
  const amountCents       = Number(payment.amount_money?.amount ?? 0);

  if (!orderId) {
    console.warn("[webhook] payment.updated missing order_id");
    return;
  }

  // ── Idempotency: skip if we already created a Booking for this order ──────
  const existingBooking = await findBookingBySquareOrderId(orderId);
  if (existingBooking) {
    console.log(`[webhook] Booking already exists for order ${orderId} — skipping`);
    return;
  }

  // ── Fetch the Square Order to get the referenceId (token) ─────────────────
  if (!squareClient) {
    console.warn("[webhook] squareClient not available");
    return;
  }

  let orderRef: string | undefined;
  try {
    const orderResp = await squareClient.orders.get({ orderId });
    orderRef = orderResp.order?.referenceId ?? undefined;
  } catch (err) {
    console.warn(`[webhook] Could not retrieve Square order ${orderId}:`, err);
    return;
  }

  if (!orderRef) {
    console.warn(`[webhook] Order ${orderId} has no referenceId`);
    return;
  }

  // ── Look up the PendingBooking by token ────────────────────────────────────
  // Token format: 32-char hex (new flow)
  // Legacy format: "scheduleId:attendeeId" — handled as a fallback below
  const isLegacyRef = /^\d+:\d+$/.test(orderRef);

  if (isLegacyRef) {
    await handleLegacyPayment({ paymentId, orderId, amountCents, referenceId: orderRef, payment });
    return;
  }

  const pending = await findPendingBookingByToken(orderRef);

  if (!pending) {
    console.warn(`[webhook] No PendingBooking found for token "${orderRef}" (order ${orderId})`);
    return;
  }

  // Store Square IDs on the PendingBooking before attempting booking creation
  // so the admin can see what Square gave us if something fails below.
  await updatePendingBooking(pending.id, {
    squareOrderId: orderId,
    squarePaymentId: paymentId,
    amountPaidCents: amountCents,
    attemptedAt: new Date().toISOString(),
  });

  try {
    // ── Resolve the CourseSchedule ──────────────────────────────────────────
    const schedule = await getCourseScheduleById(String(pending.courseSchedule));
    const course = schedule.course as Course;
    const courseId = String(course?.id ?? "");
    if (!courseId) {
      throw new Error(`Schedule ${pending.courseSchedule} has no linked course`);
    }

    // ── Find or create Attendee ─────────────────────────────────────────────
    // Prefer Square's cardholder name (verified at payment) over our form data.
    // Fall back to form data if the cardholder name is unavailable.
    const cardholderName: string = payment.card_details?.card?.card_holder_name ?? "";
    const { firstName, lastName } = cardholderName
      ? parseCardholderName(cardholderName)
      : { firstName: pending.firstName, lastName: pending.lastName };

    const buyerEmail: string = payment.buyer_email_address ?? pending.email;

    let attendee = await findAttendeeByEmail(buyerEmail);
    if (!attendee) {
      attendee = await createAttendee({
        firstName,
        lastName,
        email: buyerEmail,
        phone: pending.phone ?? undefined,
      });
    }

    // ── Create Booking ──────────────────────────────────────────────────────
    await createBookingRecord({
      attendee: attendee.id,
      course: courseId,
      courseSchedule: String(pending.courseSchedule),
      status: "confirmed",
      squareOrderId: orderId,
      squarePaymentId: paymentId,
      amountPaidCents: amountCents,
      paymentReference: orderId,
    });

    // ── Mark PendingBooking completed ───────────────────────────────────────
    await updatePendingBooking(pending.id, { status: "completed" });

    console.log(
      `[webhook] Booking created — pendingId=${pending.id} attendee=${attendee.id} order=${orderId}`,
    );

    // ── Compute session dates string (used in multiple emails below) ─────────
    const sessionDates = formatSessionDates(schedule.sessions ?? []);
    const amountDollars = formatCents(amountCents);

    // ── Booking confirmation email (always sent) ──────────────────────────────
    try {
      await sendBookingConfirmationEmail({
        to: buyerEmail,
        firstName,
        courseTitle: course.title,
        sessionDates,
        amountDollars,
        orderId,
      });
      console.log(`[webhook] Confirmation email sent to ${buyerEmail}`);
    } catch (emailErr) {
      console.error("[webhook] Confirmation email failed:", emailErr);
    }

    // ── Enrollment forms email (only if the course has one configured) ────────
    if (course?.enrollmentMessage) {
      try {
        const fileUrl  = course.enrollmentFile?.url
          ? resolveMediaUrl(course.enrollmentFile.url)
          : undefined;
        const filename = course.enrollmentFile?.filename
          ?? `${course.title.replace(/[^a-z0-9]/gi, "-")}-Enrollment-Form.pdf`;

        await sendEnrollmentEmail({
          to:               buyerEmail,
          firstName,
          courseTitle:      course.title,
          message:          course.enrollmentMessage,
          attachmentUrl:    fileUrl,
          attachmentFilename: fileUrl ? filename : undefined,
        });
        console.log(`[webhook] Enrollment email sent to ${buyerEmail}`);
      } catch (emailErr) {
        console.error("[webhook] Enrollment email failed:", emailErr);
      }
    }

    // ── Admin new booking notification ────────────────────────────────────────
    await sendAdminBookingNotification({
      firstName,
      lastName,
      email: buyerEmail,
      courseTitle: course.title,
      sessionDates,
      amountDollars,
      orderId,
    });

  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[webhook] Booking creation failed for pending ${pending.id}:`, reason);

    // Mark as failed so the admin can see it and use the Retry button
    await updatePendingBooking(pending.id, {
      status: "failed",
      failureReason: reason,
      attemptedAt: new Date().toISOString(),
    });

    // Alert the admin immediately — silent failure is easy to miss
    await sendAdminBookingFailureAlert({
      email: pending.email ?? "unknown",
      pendingId: pending.id,
      reason,
    });
  }
}

/**
 * Backward-compatible handler for orders created with the OLD referenceId
 * format ("scheduleId:attendeeId") before PendingBookings was introduced.
 */
async function handleLegacyPayment(args: {
  paymentId: string;
  orderId: string;
  amountCents: number;
  referenceId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payment: Record<string, any>;
}) {
  const { paymentId, orderId, amountCents, referenceId, payment } = args;
  const [scheduleId, attendeeIdStr] = referenceId.split(":");
  if (!scheduleId) return;

  const schedule = await getCourseScheduleById(scheduleId).catch(() => null);
  if (!schedule) return;

  const course = schedule.course as Course;
  const courseId = String(course?.id ?? "");
  if (!courseId) return;

  let attendeeId = parseInt(attendeeIdStr ?? "", 10);
  if (isNaN(attendeeId)) {
    const buyerEmail: string = payment.buyer_email_address ?? "";
    if (!buyerEmail) return;
    let attendee = await findAttendeeByEmail(buyerEmail);
    if (!attendee) {
      attendee = await createAttendee({ firstName: "Unknown", lastName: "Attendee", email: buyerEmail });
    }
    attendeeId = attendee.id;
  }

  await createBookingRecord({
    attendee: attendeeId,
    course: courseId,
    courseSchedule: scheduleId,
    status: "confirmed",
    squareOrderId: orderId,
    squarePaymentId: paymentId,
    amountPaidCents: amountCents,
    paymentReference: orderId,
  });

  console.log(`[webhook] Legacy booking created — schedule=${scheduleId} order=${orderId}`);
}

// ── Refund handler ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleRefundUpdated(event: Record<string, any>) {
  const refund = event?.data?.object?.refund;
  if (!refund || refund.status !== "COMPLETED") return;

  const paymentId: string = refund.payment_id;
  if (!paymentId || !squareClient) return;

  let orderId: string | undefined;
  try {
    const paymentResponse = await squareClient.payments.get({ paymentId });
    orderId = paymentResponse.payment?.orderId ?? undefined;
  } catch (err) {
    console.warn("[webhook] Could not retrieve payment for refund:", err);
    return;
  }

  if (!orderId) return;

  const booking = await findBookingBySquareOrderId(orderId);
  if (!booking) {
    console.log(`[webhook] No booking found for refunded order ${orderId}`);
    return;
  }
  if (booking.status === "cancelled") {
    console.log(`[webhook] Booking ${booking.id} already cancelled — skipping`);
    return;
  }

  await updateBookingStatus(booking.id, "cancelled");
  console.log(`[webhook] Booking ${booking.id} cancelled via Square refund on order ${orderId}`);

  // ── Cancellation email to attendee ──────────────────────────────────────────
  const attendee = booking.attendee as { firstName?: string; lastName?: string; email?: string } | null | undefined;
  const course   = booking.course   as { title?: string } | null | undefined;
  const attendeeEmail     = attendee?.email;
  const attendeeFirstName = attendee?.firstName ?? "";
  const attendeeName      = [attendeeFirstName, attendee?.lastName].filter(Boolean).join(" ");
  const courseTitle       = course?.title ?? "your course";
  const amountDollars     = booking.amountPaidCents ? formatCents(booking.amountPaidCents) : "";

  if (attendeeEmail) {
    try {
      await sendCancellationEmail({
        to: attendeeEmail,
        firstName: attendeeFirstName,
        courseTitle,
        amountDollars,
      });
      console.log(`[webhook] Cancellation email sent to ${attendeeEmail}`);
    } catch (emailErr) {
      console.error("[webhook] Cancellation email failed:", emailErr);
    }
  }

  // ── Admin cancellation alert ────────────────────────────────────────────────
  await sendAdminCancellationAlert({
    bookingId: booking.id,
    orderId,
    attendeeName: attendeeName || "Unknown",
    courseTitle,
  });
}
