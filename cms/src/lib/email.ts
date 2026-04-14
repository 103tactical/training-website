import { Resend } from 'resend'

let _client: Resend | null = null

function getClient(): Resend {
  if (!_client) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY is not set')
    _client = new Resend(key)
  }
  return _client
}

function getFromAddress(): string {
  const name  = process.env.FROM_NAME  || '103 Tactical Training'
  const email = process.env.FROM_EMAIL || 'onboarding@resend.dev'
  return `${name} <${email}>`
}

/**
 * Wraps a plain-text message body in a simple branded HTML email.
 * The admin provides the subject + message; this just adds the header/footer.
 */
function buildHtml(message: string): string {
  const brandName = process.env.FROM_NAME || '103 Tactical Training'
  // Convert newlines to <br> so plain-text messages render correctly
  const bodyHtml = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${brandName}</title>
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
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9;padding:20px 32px;border-top:1px solid #e8e8e8;font-size:12px;color:#888888;text-align:center;">
              <p style="margin:0;">${brandName}</p>
              <p style="margin:4px 0 0;">You are receiving this message because you have been in contact with us.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export interface SendResult {
  sent: number
  failed: number
  errors: string[]
}

/**
 * Send an email to a single recipient.
 */
export async function sendEmail({
  to,
  subject,
  message,
}: {
  to: string
  subject: string
  message: string
}): Promise<void> {
  const resend = getClient()
  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject,
    html: buildHtml(message),
    text: message,
  })
  if (error) throw new Error(error.message)
}

/**
 * Send the same email to a list of recipients (one email per address).
 * Returns a summary of how many succeeded and any errors.
 */
export async function sendBulkEmail({
  recipients,
  subject,
  message,
}: {
  recipients: string[]
  subject: string
  message: string
}): Promise<SendResult> {
  const resend  = getClient()
  const from    = getFromAddress()
  const html    = buildHtml(message)
  const unique  = [...new Set(recipients.map((r) => r.toLowerCase().trim()).filter(Boolean))]

  const result: SendResult = { sent: 0, failed: 0, errors: [] }

  // Send in small batches to stay well within Resend's rate limit (100 req/s)
  const BATCH = 10
  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH)
    await Promise.all(
      batch.map(async (to) => {
        const { error } = await resend.emails.send({
          from,
          to,
          subject,
          html,
          text: message,
        })
        if (error) {
          result.failed++
          result.errors.push(`${to}: ${error.message}`)
        } else {
          result.sent++
        }
      }),
    )
    // Brief pause between batches
    if (i + BATCH < unique.length) {
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  return result
}
