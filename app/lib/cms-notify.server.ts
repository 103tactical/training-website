/**
 * Create a dismissable notification in the CMS (shown on the admin
 * dashboard banner and the Notifications page).
 *
 * Deliberately curated — only events that require the admin to DO
 * something get a notification (contact message received, paid-but-
 * waitlisted, booking-creation failure). Informational events stay
 * email-only.
 *
 * Always non-fatal: a notification is a reminder, never worth failing
 * a booking or a form submission over.
 */
export async function createCmsNotification(args: {
  whatHappened: string;
  whatToDo: string;
  link?: string;
  linkLabel?: string;
}): Promise<void> {
  const base = process.env.PAYLOAD_API_URL;
  const secret = process.env.CMS_WRITE_SECRET;
  if (!base || !secret) return;

  try {
    const res = await fetch(`${base}/api/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(args),
    });
    if (!res.ok) {
      console.error(`[cms-notify] Notification create failed: HTTP ${res.status}`);
    }
  } catch (err) {
    console.error("[cms-notify] Notification create failed:", err);
  }
}
