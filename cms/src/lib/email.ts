import { saveQuota } from './resend-quota-cache'

function getFromAddress(): string {
  const name  = process.env.FROM_NAME  || '103 Tactical Training'
  const email = process.env.FROM_EMAIL || 'onboarding@resend.dev'
  return `${name} <${email}>`
}

// ── Raw fetch wrapper ─────────────────────────────────────────────────────────
// Uses fetch directly instead of the Resend SDK so we can read response headers
// and persist the quota counts after every send.

interface RawSendParams {
  from:         string
  to:           string
  subject:      string
  html:         string
  text:         string
  attachments?: EmailAttachment[]
}

interface RawSendError {
  message:    string | null
  name:       string | null
  statusCode: number | null
}

async function rawSend(params: RawSendParams): Promise<{ error: RawSendError | null }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { error: { message: 'RESEND_API_KEY is not set', name: null, statusCode: null } }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: Record<string, any> = {
    from:    params.from,
    to:      params.to,
    subject: params.subject,
    html:    params.html,
    text:    params.text,
  }

  if (params.attachments && params.attachments.length > 0) {
    body.attachments = params.attachments.map(a => ({
      filename: a.filename,
      content:  a.content.toString('base64'),
    }))
  }

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  // Capture quota headers from every send and persist to disk
  const daily   = res.headers.get('x-resend-daily-quota')
  const monthly = res.headers.get('x-resend-monthly-quota')
  if (daily !== null || monthly !== null) {
    saveQuota(
      daily   !== null ? parseInt(daily,   10) : null,
      monthly !== null ? parseInt(monthly, 10) : null,
    ).catch(() => {})
  }

  if (!res.ok) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json().catch(() => ({}))
    return { error: { message: json?.message ?? `HTTP ${res.status}`, name: json?.name ?? null, statusCode: res.status } }
  }

  return { error: null }
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

export interface EmailAttachment {
  filename: string
  content: Buffer
}

export interface SendResult {
  sent: number
  failed: number
  errors: string[]
  /**
   * Set when Resend rejected sends due to a quota or rate limit.
   * Contains a human-readable message with an estimated reset time.
   * When present, remaining recipients were skipped — not all failed
   * addresses were attempted.
   */
  quotaError?: string
}

/**
 * Classify a Resend error and return a human-readable message.
 * For quota errors, includes an estimated reset time.
 */
function describeResendError(error: { message?: string | null; name?: string | null; statusCode?: number | null }): {
  display: string
  isQuota: boolean
  isRateLimit: boolean
} {
  const msg = (error.message ?? '').toLowerCase()
  const isQuota = msg.includes('daily') || msg.includes('quota') || msg.includes('monthly') || msg.includes('limit exceeded')
  const isRateLimit = !isQuota && (
    error.name === 'rate_limit_exceeded' ||
    msg.includes('rate limit') ||
    error.statusCode === 429
  )

  if (isQuota) {
    const now = new Date()
    const midnight = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1,
    ))
    const resetUTC = midnight.toUTCString()
    return {
      display: `Resend email quota reached — sending stopped. Email will resume at approximately midnight UTC (${resetUTC}). Upgrade your Resend plan at resend.com/pricing to avoid this limit.`,
      isQuota: true,
      isRateLimit: false,
    }
  }

  if (isRateLimit) {
    return {
      display: 'Resend rate limit hit (too many requests per second). Wait a few seconds and try again.',
      isQuota: false,
      isRateLimit: true,
    }
  }

  return {
    display: error.message ?? 'Unknown Resend error',
    isQuota: false,
    isRateLimit: false,
  }
}

/**
 * Send an email to a single recipient.
 */
export async function sendEmail({
  to,
  subject,
  message,
  attachments = [],
}: {
  to: string
  subject: string
  message: string
  attachments?: EmailAttachment[]
}): Promise<void> {
  const { error } = await rawSend({
    from:        getFromAddress(),
    to,
    subject,
    html:        buildHtml(message),
    text:        message,
    attachments,
  })
  if (error) throw new Error(error.message ?? 'Resend send failed')
}

/**
 * Send the same email to a list of recipients (one email per address).
 * Returns a summary of how many succeeded and any errors.
 */
export async function sendBulkEmail({
  recipients,
  subject,
  message,
  attachments = [],
}: {
  recipients: string[]
  subject: string
  message: string
  attachments?: EmailAttachment[]
}): Promise<SendResult> {
  const from    = getFromAddress()
  const html    = buildHtml(message)
  const unique  = [...new Set(recipients.map((r) => r.toLowerCase().trim()).filter(Boolean))]
  const hasAttachments = attachments.length > 0

  const result: SendResult = { sent: 0, failed: 0, errors: [] }

  // Send in small batches to stay well within Resend's rate limit (5 req/s)
  const BATCH = 10
  for (let i = 0; i < unique.length; i += BATCH) {
    // Stop immediately if a quota error was already detected — no point
    // hammering Resend when the account is over its limit.
    if (result.quotaError) break

    const batch = unique.slice(i, i + BATCH)
    await Promise.all(
      batch.map(async (to) => {
        if (result.quotaError) return  // another in this batch already hit quota
        const { error } = await rawSend({
          from,
          to,
          subject,
          html,
          text: message,
          ...(hasAttachments && { attachments }),
        })
        if (error) {
          const { display, isQuota } = describeResendError(error)
          if (isQuota) {
            // Record the quota error and skip all subsequent recipients
            result.quotaError = display
          }
          result.failed++
          result.errors.push(`${to}: ${display}`)
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

  // Mark skipped recipients as failed so the count is accurate
  const attempted = result.sent + result.failed
  const skipped   = unique.length - attempted
  if (skipped > 0 && result.quotaError) {
    result.failed += skipped
  }

  return result
}
