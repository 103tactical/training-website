/**
 * Square webhook receiver.
 *
 * Square will POST to this endpoint for every subscribed event.
 * We verify the signature, then act on:
 *
 *   payment.updated  (status → COMPLETED)
 *     → Create Attendee (if new) + Booking in our DB
 *
 *   refund.updated   (status → COMPLETED)
 *     → Mark the matching Booking as cancelled
 *       (seat adjustment + waitlist promotion run via the CMS afterChange hook)
 *
 * The endpoint always responds 200 as quickly as possible so Square doesn't
 * retry. Errors are logged but never surface a 5xx to Square.
 */
import { type ActionFunctionArgs } from "@remix-run/node";
import {
  squareClient,
  verifySquareWebhook,
  SQUARE_CONFIGURED,
} from "~/lib/square.server";
import {
  getCourseScheduleById,
  findBookingBySquareOrderId,
  createBookingRecord,
  updateBookingStatus,
  findAttendeeByEmail,
  createAttendee,
} from "~/lib/payload";
import type { Course } from "~/lib/payload";

// Square only POSTs to this endpoint
export async function action({ request }: ActionFunctionArgs) {
  // Read raw body once — needed for signature verification
  const rawBody = await request.text();

  // ── Signature verification ────────────────────────────────────────────────
  if (SQUARE_CONFIGURED) {
    const sigHeader = request.headers.get("x-square-hmacsha256-signature") ?? "";
    const webhookUrl = `${process.env.PUBLIC_SITE_URL ?? ""}/api/square-webhook`;
    const valid = verifySquareWebhook(rawBody, sigHeader, webhookUrl);
    if (!valid) {
      console.warn("[webhook] Invalid Square signature — ignoring");
      return new Response("Unauthorized", { status: 401 });
    }
  } else {
    console.warn("[webhook] Square not configured — skipping signature check (dev mode)");
  }

  // ── Parse event ───────────────────────────────────────────────────────────
  let event: Record<string, unknown>;
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
    // Log but always return 200 — Square will retry on non-2xx
    console.error("[webhook] Handler error:", err);
  }

  return new Response("OK", { status: 200 });
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handlePaymentUpdated(event: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payment = (event as any)?.data?.object?.payment;
  if (!payment) return;
  if (payment.status !== "COMPLETED") return;

  const paymentId: string = payment.id;
  const orderId: string   = payment.order_id;
  const amountCents       = Number(payment.amount_money?.amount ?? 0);

  if (!orderId) {
    console.warn("[webhook] payment.updated missing order_id");
    return;
  }

  // ── Idempotency: skip if booking already exists for this order ────────────
  const existing = await findBookingBySquareOrderId(orderId);
  if (existing) {
    console.log(`[webhook] Booking already exists for order ${orderId} — skipping`);
    return;
  }

  // ── Fetch the Square Order to get referenceId ─────────────────────────────
  if (!squareClient) {
    console.warn("[webhook] squareClient not available — cannot fetch order");
    return;
  }

  const { result } = await squareClient.ordersApi.retrieveOrder(orderId);
  const order = result.order;
  if (!order) {
    console.warn(`[webhook] Could not retrieve Square order ${orderId}`);
    return;
  }

  // referenceId format: "{scheduleId}:{attendeeId}"
  const refId = order.referenceId ?? "";
  const [scheduleId, attendeeIdStr] = refId.split(":");

  if (!scheduleId) {
    console.warn(`[webhook] Order ${orderId} has no recognisable referenceId: "${refId}"`);
    return;
  }

  // ── Resolve the CourseSchedule ────────────────────────────────────────────
  let schedule;
  try {
    schedule = await getCourseScheduleById(scheduleId);
  } catch {
    console.warn(`[webhook] Could not fetch schedule ${scheduleId}`);
    return;
  }

  const course = schedule.course as Course;
  const courseId = String(course?.id ?? "");
  if (!courseId) {
    console.warn(`[webhook] Schedule ${scheduleId} has no course`);
    return;
  }

  // ── Resolve Attendee ─────────────────────────────────────────────────────
  let attendeeId = parseInt(attendeeIdStr ?? "", 10);

  // If the attendee ID in the reference is invalid, fall back to creating by email
  if (isNaN(attendeeId)) {
    const buyerEmail: string =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (order as any).fulfillments?.[0]?.digitalDetails?.email ??
      payment.buyer_email_address ??
      "";

    if (!buyerEmail) {
      console.warn(`[webhook] Cannot resolve attendee for order ${orderId}`);
      return;
    }

    let attendee = await findAttendeeByEmail(buyerEmail);
    if (!attendee) {
      attendee = await createAttendee({
        firstName: "Unknown",
        lastName: "Attendee",
        email: buyerEmail,
      });
    }
    attendeeId = attendee.id;
  }

  // ── Create Booking ────────────────────────────────────────────────────────
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

  console.log(
    `[webhook] Booking created — schedule=${scheduleId} attendee=${attendeeId} order=${orderId}`,
  );
}

async function handleRefundUpdated(event: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const refund = (event as any)?.data?.object?.refund;
  if (!refund) return;
  if (refund.status !== "COMPLETED") return;

  const paymentId: string = refund.payment_id;
  if (!paymentId) return;

  // Fetch payment to get the order ID
  if (!squareClient) return;
  let orderId: string | undefined;
  try {
    const { result } = await squareClient.paymentsApi.getPayment(paymentId);
    orderId = result.payment?.orderId ?? undefined;
  } catch (err) {
    console.warn("[webhook] Could not retrieve payment for refund:", err);
    return;
  }

  if (!orderId) return;

  // Find our booking
  const booking = await findBookingBySquareOrderId(orderId);
  if (!booking) {
    console.log(`[webhook] No booking found for refunded order ${orderId} — nothing to cancel`);
    return;
  }

  // Already cancelled — idempotent
  if (booking.status === "cancelled") {
    console.log(`[webhook] Booking ${booking.id} already cancelled — skipping`);
    return;
  }

  await updateBookingStatus(booking.id, "cancelled");
  console.log(`[webhook] Booking ${booking.id} marked cancelled via refund on order ${orderId}`);
}
