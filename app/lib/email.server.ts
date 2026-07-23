/**
 * Server-only email utility for the Remix website.
 * Used by the Square webhook handler and the contact form.
 *
 * Sends go through Resend's REST API via raw fetch (not the SDK) so the
 * x-resend-*-quota response headers can be read and reported to the CMS's
 * quota cache — the CMS dashboard widget shows combined usage across both
 * services.
 */

interface SendParams {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; path: string }[];
}

/**
 * Report quota counts to the CMS cache. Fire-and-forget — quota tracking
 * must never affect email delivery.
 */
function reportQuota(daily: string | null, monthly: string | null): void {
  if (daily === null && monthly === null) return;
  const base = process.env.PAYLOAD_API_URL;
  const secret = process.env.CMS_WRITE_SECRET;
  if (!base || !secret) return;
  fetch(`${base}/api/resend-quota`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      dailyUsed:   daily   !== null ? parseInt(daily, 10)   : undefined,
      monthlyUsed: monthly !== null ? parseInt(monthly, 10) : undefined,
    }),
  }).catch((err) => console.error("[email] quota report failed:", err));
}

/**
 * Send one email via the Resend REST API.
 * Returns { error } in the same shape callers previously got from the SDK.
 */
async function sendViaResend(params: SendParams): Promise<{ error: { message: string } | null }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      ...(params.attachments?.length ? { attachments: params.attachments } : {}),
    }),
  });

  reportQuota(
    res.headers.get("x-resend-daily-quota"),
    res.headers.get("x-resend-monthly-quota"),
  );

  if (!res.ok) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json().catch(() => ({}));
    return { error: { message: json?.message ?? `HTTP ${res.status}` } };
  }
  return { error: null };
}

function getFromAddress(): string {
  const name  = process.env.FROM_NAME  || "103 Tactical Training";
  const email = process.env.FROM_EMAIL || "onboarding@resend.dev";
  return `${name} <${email}>`;
}

function getAdminEmail(): string | null {
  return process.env.ADMIN_EMAIL?.trim() || null;
}

// ── Contact phone (from CMS Site Settings, cached 5 min) ─────────────────────

let _phoneCache: { value: string | null; at: number } | null = null;

async function getContactPhone(): Promise<string | null> {
  if (_phoneCache && Date.now() - _phoneCache.at < 5 * 60 * 1000) return _phoneCache.value;
  try {
    const res = await fetch(`${process.env.PAYLOAD_API_URL}/api/globals/site-settings?depth=0`);
    const json = await res.json();
    const phone: string | null = json?.contact?.phone?.trim() || null;
    _phoneCache = { value: phone, at: Date.now() };
    return phone;
  } catch {
    return _phoneCache?.value ?? null;
  }
}

/** "Questions? Please call us at NUMBER." — falls back if no phone is set. */
export async function questionsLine(): Promise<string> {
  const phone = await getContactPhone();
  return phone ? `Questions? Please call us at ${phone}.` : `Questions? Contact us through the website.`;
}

/** Format cents as a dollar string, e.g. 20000 → "$200.00" */
function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;

}
export { formatCents };

/**
 * Format an array of session dates into a human-readable string.
 * e.g. "Mon, Jan 5, 2026, Sat, Jan 10, 2026"
 */
export function formatSessionDates(sessions: { date?: string }[]): string {
  if (!sessions.length) return "";
  const fmt = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return sessions
    .filter((s) => s.date)
    .map((s) => {
      try { return fmt.format(new Date(s.date!)); }
      catch { return s.date!; }
    })
    .join(", ");
}

// ── Shared HTML shell ─────────────────────────────────────────────────────────

function brandedHtml(title: string, bodyHtml: string): string {
  const brandName = process.env.FROM_NAME || "103 Tactical Training";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="max-width:600px;width:100%;background:#ffffff;border-radius:6px;overflow:hidden;">
        <tr>
          <td style="background:#111111;padding:24px 32px;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">${brandName}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;font-size:15px;line-height:1.6;color:#333333;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background:#f9f9f9;padding:20px 32px;border-top:1px solid #e8e8e8;
                     font-size:12px;color:#888888;text-align:center;">
            <p style="margin:0;">${brandName}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function detailRow(label: string, value: string, first = false): string {
  const border = first ? "" : "border-top:1px solid #e8e8e8;";
  return `<tr>
    <td style="padding:12px 16px;font-size:13px;color:#888;font-weight:600;
               text-transform:uppercase;letter-spacing:0.5px;${border}">${label}</td>
    <td style="padding:12px 16px;font-size:15px;color:#111;${border}">${value}</td>
  </tr>`;
}

// ── 1. Enrollment Forms (existing) ────────────────────────────────────────────

/**
 * Send the course enrollment forms email to a newly confirmed attendee.
 * Only fires when the course has an enrollmentMessage configured.
 */
export async function sendEnrollmentEmail(args: {
  to: string;
  firstName: string;
  courseTitle: string;
  message: string;
  attachmentUrl?: string;
  attachmentFilename?: string;
}): Promise<void> {
  const { to, firstName, courseTitle, message, attachmentUrl, attachmentFilename } = args;
  const q = await questionsLine();
  const subject = `Your Enrollment Forms — ${courseTitle}`;

  const bodyHtml = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  const attachmentNote = attachmentUrl
    ? `<p style="margin:16px 0 0;padding:14px 16px;background:#fff8f0;
                 border-left:3px solid #ea580c;font-size:14px;color:#444;">
         <strong>An enrollment document is attached.</strong><br>
         Please review it before your first day of class. If it includes a form, please complete it and bring it with you.
       </p>`
    : "";

  const html = brandedHtml(subject, `
    <p style="margin:0 0 16px;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;">Thank you for enrolling in <strong>${courseTitle}</strong>.
      Please review the following information before your course date.</p>
    <div style="margin:0 0 16px;">${bodyHtml}</div>
    ${attachmentNote}
    <p style="margin:16px 0 0;font-size:14px;color:#666;">${q}</p>
  `);

  const text = `Hi ${firstName},\n\nThank you for enrolling in ${courseTitle}. Please review the following before your course date.\n\n${message}${attachmentUrl ? "\n\nAn enrollment document is attached. Please review it before your first day of class. If it includes a form, please complete it and bring it with you." : ""}`;

  const { error } = await sendViaResend({
    from: getFromAddress(),
    to,
    subject,
    html,
    text,
    attachments: attachmentUrl
      ? [{ filename: attachmentFilename || "Enrollment-Form.pdf", path: attachmentUrl }]
      : [],
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ── 2. Booking confirmation (to attendee) ─────────────────────────────────────

/**
 * Send a booking confirmation to the attendee immediately after payment is processed.
 * Always fires regardless of whether enrollment forms are configured.
 */
export async function sendBookingConfirmationEmail(args: {
  to: string;
  firstName: string;
  courseTitle: string;
  sessionDates: string;
  amountDollars: string;
  orderId: string;
}): Promise<void> {
  const { to, firstName, courseTitle, sessionDates, amountDollars, orderId } = args;
  const q = await questionsLine();
  const subject = `Booking Confirmed — ${courseTitle}`;

  const rows = [
    detailRow("Course", `<strong>${courseTitle}</strong>`, true),
    ...(sessionDates ? [detailRow("Date(s)", sessionDates)] : []),
    detailRow("Amount Paid", amountDollars),
    detailRow("Order", `<code style="font-size:12px;color:#555;">${orderId}</code>`),
  ].join("");

  const html = brandedHtml(subject, `
    <p style="margin:0 0 16px;">Hi ${firstName},</p>
    <p style="margin:0 0 24px;">Your booking is confirmed. We look forward to seeing you!</p>
    <table width="100%" cellpadding="0" cellspacing="0"
      style="border:1px solid #e8e8e8;border-radius:4px;overflow:hidden;margin-bottom:24px;
             background:#f9f9f9;">
      ${rows}
    </table>
    <p style="margin:0;font-size:14px;color:#666;">${q}</p>
  `);

  const text = [
    `Hi ${firstName},`,
    ``,
    `Your booking is confirmed!`,
    ``,
    `Course: ${courseTitle}`,
    ...(sessionDates ? [`Date(s): ${sessionDates}`] : []),
    `Amount Paid: ${amountDollars}`,
    `Order: ${orderId}`,
    ``,
    q,
  ].join("\n");

  const { error } = await sendViaResend({
    from: getFromAddress(),
    to,
    subject,
    html,
    text,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ── 2b. Waitlisted payment notice (to attendee — seat race edge case) ─────────

/**
 * Sent instead of the booking confirmation when a payment arrives for a
 * session that filled up while the person was checking out. Honest about
 * the situation: payment received, spot in line held, seat not guaranteed.
 */
export async function sendWaitlistedPaymentEmail(args: {
  to: string;
  firstName: string;
  courseTitle: string;
  sessionDates: string;
  amountDollars: string;
}): Promise<void> {
  const { to, firstName, courseTitle, sessionDates, amountDollars } = args;
  const q = await questionsLine();
  const subject = `Payment Received — You're on the Waitlist for ${courseTitle}`;

  const html = brandedHtml(subject, `
    <p style="margin:0 0 16px;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;">We received your payment of <strong>${amountDollars}</strong> for
      <strong>${courseTitle}</strong>${sessionDates ? ` (${sessionDates})` : ""} — but the last seat
      was taken just before your payment completed.</p>
    <p style="margin:0 0 16px;"><strong>Your payment holds your place on the waitlist.</strong> If a seat
      opens up, you'll be enrolled automatically (in the order payments were received) and emailed right away.</p>
    <p style="margin:0 0 16px;">If no seat becomes available, we'll contact you to either move you
      to another session date or refund your payment in full — whichever you prefer.</p>
    <p style="margin:16px 0 0;font-size:14px;color:#666;">${q}</p>
  `);

  const text = `Hi ${firstName},

We received your payment of ${amountDollars} for ${courseTitle}${sessionDates ? ` (${sessionDates})` : ""} — but the last seat was taken just before your payment completed.

Your payment holds your place on the waitlist. If a seat opens up, you'll be enrolled automatically (in the order payments were received) and emailed right away.

If no seat becomes available, we'll contact you to either move you to another session date or refund your payment in full — whichever you prefer.

${q}`;

  const { error } = await sendViaResend({
    from: getFromAddress(),
    to,
    subject,
    html,
    text,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ── 3. Cancellation confirmation (to attendee) ────────────────────────────────

/**
 * Notify the attendee that their booking has been cancelled and a refund submitted.
 */
export async function sendCancellationEmail(args: {
  to: string;
  firstName: string;
  courseTitle: string;
  amountDollars: string;
}): Promise<void> {
  const { to, firstName, courseTitle, amountDollars } = args;
  const q = await questionsLine();
  const subject = `Booking Cancelled — ${courseTitle}`;

  const html = brandedHtml(subject, `
    <p style="margin:0 0 16px;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;">Your booking for <strong>${courseTitle}</strong> has been cancelled
      and a refund of <strong>${amountDollars}</strong> has been submitted through Square.</p>
    <p style="margin:0 0 16px;">Refunds typically appear on your statement within 5–10 business days.</p>
    <p style="margin:0;font-size:14px;color:#666;">${q}</p>
  `);

  const text = [
    `Hi ${firstName},`,
    ``,
    `Your booking for ${courseTitle} has been cancelled and a refund of ${amountDollars} has been submitted.`,
    ``,
    `Refunds typically appear within 5–10 business days.`,
    ``,
    q,
  ].join("\n");

  const { error } = await sendViaResend({
    from: getFromAddress(),
    to,
    subject,
    html,
    text,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ── Admin notification helpers ─────────────────────────────────────────────────

/**
 * Internal helper — send a plain admin notification to ADMIN_EMAIL.
 * Silently skips if ADMIN_EMAIL is not configured.
 */
async function sendAdminEmail(subject: string, rows: string[], textLines: string[]): Promise<void> {
  const adminEmail = getAdminEmail();
  if (!adminEmail) return;

  const rowsHtml = rows
    .map((r) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#333;">${r}</p>`)
    .join("");

  const html = brandedHtml(subject, rowsHtml);
  const text = textLines.join("\n");

  // Non-fatal — never throw on admin notifications
  try {
    const { error } = await sendViaResend({
      from: getFromAddress(),
      to: adminEmail,
      subject,
      html,
      text,
    });
    if (error) console.error("[email] Admin notification failed:", error.message);
  } catch (err) {
    console.error("[email] Admin notification failed:", err);
  }
}

// ── 4. Admin — new booking alert ──────────────────────────────────────────────

export async function sendAdminBookingNotification(args: {
  firstName: string;
  lastName: string;
  email: string;
  courseTitle: string;
  sessionDates: string;
  amountDollars: string;
  orderId: string;
  waitlisted?: boolean;
}): Promise<void> {
  const { firstName, lastName, email, courseTitle, sessionDates, amountDollars, orderId, waitlisted } = args;
  await sendAdminEmail(
    waitlisted
      ? `⚠ PAID BUT WAITLISTED — ${firstName} ${lastName} → ${courseTitle}`
      : `New Booking — ${firstName} ${lastName} → ${courseTitle}`,
    [
      ...(waitlisted
        ? [`<strong style="color:#b45309;">This person PAID but the session was full — they were placed on the waitlist.</strong>`,
           `They were told a seat is not yet guaranteed. Free a seat (cancellation or raise Total Seats) to auto-promote them, move them to another session, or refund them from Square.`]
        : [`<strong>New booking received.</strong>`]),
      `<strong>Name:</strong> ${firstName} ${lastName}`,
      `<strong>Email:</strong> ${email}`,
      `<strong>Course:</strong> ${courseTitle}`,
      ...(sessionDates ? [`<strong>Date(s):</strong> ${sessionDates}`] : []),
      `<strong>Amount:</strong> ${amountDollars}`,
      `<strong>Order ID:</strong> <code style="font-size:12px;">${orderId}</code>`,
    ],
    [
      `New Booking — ${firstName} ${lastName} → ${courseTitle}`,
      ``,
      `Name: ${firstName} ${lastName}`,
      `Email: ${email}`,
      `Course: ${courseTitle}`,
      ...(sessionDates ? [`Date(s): ${sessionDates}`] : []),
      `Amount: ${amountDollars}`,
      `Order ID: ${orderId}`,
    ],
  );
}

// ── 5. Admin — booking failure alert ──────────────────────────────────────────

export async function sendAdminBookingFailureAlert(args: {
  email: string;
  pendingId: number | string;
  reason: string;
}): Promise<void> {
  const { email, pendingId, reason } = args;
  const cmsBase = process.env.PAYLOAD_API_URL ?? "https://training-cms.onrender.com";
  const cmsLink = `${cmsBase}/admin/collections/pending-bookings`;

  await sendAdminEmail(
    `⚠️ Booking Creation Failed — ${email}`,
    [
      `<strong style="color:#c00;">A booking failed to create after payment was received.</strong>`,
      `<strong>Customer email:</strong> ${email}`,
      `<strong>Pending Booking ID:</strong> ${pendingId}`,
      `<strong>Reason:</strong> ${reason}`,
      `<a href="${cmsLink}" style="color:#ea580c;">Review in CMS → Pending Bookings</a>`,
    ],
    [
      `⚠️ Booking Creation Failed`,
      ``,
      `Customer email: ${email}`,
      `Pending Booking ID: ${pendingId}`,
      `Reason: ${reason}`,
      ``,
      `Review: ${cmsLink}`,
    ],
  );
}

// ── 6. Admin — cancellation/refund alert ──────────────────────────────────────

export async function sendAdminCancellationAlert(args: {
  bookingId: number | string;
  orderId: string;
  attendeeName: string;
  courseTitle: string;
}): Promise<void> {
  const { bookingId, orderId, attendeeName, courseTitle } = args;
  await sendAdminEmail(
    `Booking Cancelled via Refund — ${attendeeName}`,
    [
      `A booking has been cancelled following a completed Square refund.`,
      `<strong>Attendee:</strong> ${attendeeName}`,
      `<strong>Course:</strong> ${courseTitle}`,
      `<strong>Booking ID:</strong> ${bookingId}`,
      `<strong>Square Order ID:</strong> <code style="font-size:12px;">${orderId}</code>`,
    ],
    [
      `Booking Cancelled via Refund`,
      ``,
      `Attendee: ${attendeeName}`,
      `Course: ${courseTitle}`,
      `Booking ID: ${bookingId}`,
      `Square Order ID: ${orderId}`,
    ],
  );
}

// ── 7. Admin — contact form notification ──────────────────────────────────────

export async function sendAdminContactFormEmail(args: {
  name: string;
  email: string;
  phone: string;
  topic: string;
  message: string;
}): Promise<void> {
  const { name, email, phone, topic, message } = args;
  const safeMessage = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  await sendAdminEmail(
    `New Contact Form — ${topic}`,
    [
      `<strong>Name:</strong> ${name}`,
      `<strong>Email:</strong> <a href="mailto:${email}" style="color:#ea580c;">${email}</a>`,
      `<strong>Phone:</strong> ${phone}`,
      `<strong>Topic:</strong> ${topic}`,
      `<strong>Message:</strong><br>${safeMessage || "<em style='color:#888;'>No message provided.</em>"}`,
    ],
    [
      `New Contact Form — ${topic}`,
      ``,
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Topic: ${topic}`,
      `Message: ${message || "(none)"}`,
    ],
  );
}
