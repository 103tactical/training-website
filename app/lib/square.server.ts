/**
 * Square SDK client — server-only module (never imported on the client).
 *
 * Environment variables required (set on the Render dashboard for the website):
 *   SQUARE_ACCESS_TOKEN       — production or sandbox access token
 *   SQUARE_LOCATION_ID        — Square location ID for this business
 *   SQUARE_WEBHOOK_SIGNATURE_KEY — signing secret from Square Developer Dashboard
 *   SQUARE_ENVIRONMENT        — "production" (default) or "sandbox"
 */
import { Client, Environment } from 'square'

const env = process.env.SQUARE_ENVIRONMENT === 'sandbox'
  ? Environment.Sandbox
  : Environment.Production

export const squareClient = process.env.SQUARE_ACCESS_TOKEN
  ? new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: env,
    })
  : null

export const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID ?? ''
export const SQUARE_WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY ?? ''
export const SQUARE_CONFIGURED = Boolean(
  process.env.SQUARE_ACCESS_TOKEN &&
  process.env.SQUARE_LOCATION_ID &&
  process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
)

/**
 * Verify that an incoming webhook request genuinely came from Square.
 * Uses HMAC-SHA256 over the raw request body.
 */
export function verifySquareWebhook(
  rawBody: string,
  signatureHeader: string,
  notificationUrl: string,
): boolean {
  if (!SQUARE_WEBHOOK_SIGNATURE_KEY) return false
  try {
    // Square's signature is: base64( HMAC-SHA256( signatureKey, notificationUrl + rawBody ) )
    const crypto = require('crypto') as typeof import('crypto')
    const hmac = crypto.createHmac('sha256', SQUARE_WEBHOOK_SIGNATURE_KEY)
    hmac.update(notificationUrl + rawBody)
    const expected = hmac.digest('base64')
    return expected === signatureHeader
  } catch {
    return false
  }
}
