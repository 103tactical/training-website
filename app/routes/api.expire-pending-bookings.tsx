/**
 * Cron endpoint — marks stale pending bookings as expired.
 *
 * Call this on a schedule (e.g. every hour via cron-job.org).
 * Protected by CRON_SECRET to prevent unauthorized calls.
 *
 * Any PendingBooking with status="pending" and createdAt older than 24 hours
 * is marked "expired". These represent visitors who started checkout but
 * never completed payment — a useful prospecting list for the admin.
 *
 * Example cron URL:
 *   POST https://your-site.com/api/expire-pending-bookings
 *   Headers: { Authorization: Bearer <CRON_SECRET> }
 */
import { type ActionFunctionArgs, json } from "@remix-run/node";
import { expireStalePendingBookings } from "~/lib/payload";

export async function action({ request }: ActionFunctionArgs) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (token !== cronSecret) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  try {
    const expiredIds = await expireStalePendingBookings(24);
    console.log(`[expire-pending] Expired ${expiredIds.length} pending booking(s):`, expiredIds);
    return json({ expired: expiredIds.length, ids: expiredIds });
  } catch (err) {
    console.error("[expire-pending] Error:", err);
    return json({ error: String(err) }, { status: 500 });
  }
}
