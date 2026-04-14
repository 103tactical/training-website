/**
 * Server-only email utility for the Remix website.
 * Used by the Square webhook handler to send enrollment emails
 * after a booking is confirmed.
 */
import { Resend } from "resend";

let _client: Resend | null = null;

function getClient(): Resend {
  if (!_client) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not set");
    _client = new Resend(key);
  }
  return _client;
}

function getFromAddress(): string {
  const name  = process.env.FROM_NAME  || "103 Tactical Training";
  const email = process.env.FROM_EMAIL || "onboarding@resend.dev";
  return `${name} <${email}>`;
}

function buildEnrollmentHtml(args: {
  firstName: string;
  courseTitle: string;
  message: string;
  hasAttachment: boolean;
}): string {
  const { firstName, courseTitle, message, hasAttachment } = args;
  const brandName = process.env.FROM_NAME || "103 Tactical Training";

  const bodyHtml = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  const attachmentNote = hasAttachment
    ? `<p style="margin:16px 0 0;padding:14px 16px;background:#fff8f0;border-left:3px solid #ea580c;font-size:14px;color:#444;">
        <strong>📎 An enrollment document is attached.</strong><br>
        Please review, complete, and bring it with you on the first day of class.
       </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Enrollment Forms — ${courseTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:6px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#111111;padding:24px 32px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">${brandName}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;font-size:15px;line-height:1.6;color:#333333;">
              <p style="margin:0 0 16px;">Hi ${firstName},</p>
              <p style="margin:0 0 16px;">Thank you for enrolling in <strong>${courseTitle}</strong>. Please review the following information before your course date.</p>
              <div style="margin:0 0 16px;">${bodyHtml}</div>
              ${attachmentNote}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9;padding:20px 32px;border-top:1px solid #e8e8e8;font-size:12px;color:#888888;text-align:center;">
              <p style="margin:0;">${brandName}</p>
              <p style="margin:4px 0 0;">Questions? Reply to this email or contact us directly.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send an enrollment email to a newly confirmed attendee.
 * If the course has an enrollment document, it is attached as a PDF.
 * Failures are caught and logged — they never block the booking record.
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

  const resend = getClient();
  const subject = `Your Enrollment Forms — ${courseTitle}`;
  const html = buildEnrollmentHtml({ firstName, courseTitle, message, hasAttachment: !!attachmentUrl });
  const text = `Hi ${firstName},\n\nThank you for enrolling in ${courseTitle}. Please review the following before your course date.\n\n${message}${attachmentUrl ? "\n\nAn enrollment document is attached. Please review, complete, and bring it on the first day of class." : ""}`;

  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject,
    html,
    text,
    attachments: attachmentUrl
      ? [{ filename: attachmentFilename || "Enrollment-Form.pdf", path: attachmentUrl }]
      : [],
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
