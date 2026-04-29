/**
 * Square SDK client — server-only module (never imported on the client).
 *
 * Environment variables required (set on the Render dashboard for the website):
 *   SQUARE_ACCESS_TOKEN          — production or sandbox access token
 *   SQUARE_LOCATION_ID           — Square location ID for this business
 *   SQUARE_WEBHOOK_SIGNATURE_KEY — signing secret from Square Developer Dashboard
 *   SQUARE_ENVIRONMENT           — "production" (default) or "sandbox"
 */
import { SquareClient, SquareEnvironment, WebhooksHelper } from 'square'

const env =
  process.env.SQUARE_ENVIRONMENT === 'sandbox'
    ? SquareEnvironment.Sandbox
    : SquareEnvironment.Production

export const squareClient = process.env.SQUARE_ACCESS_TOKEN
  ? new SquareClient({
      token: process.env.SQUARE_ACCESS_TOKEN,
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
 * Returns the credit-card surcharge percentage to apply at checkout.
 *
 * NOTE: Square's Catalog API does not expose service charges configured in the
 * Square Dashboard — SERVICE_CHARGE is not a listable CatalogObjectType. The
 * SQUARE_SURCHARGE_PERCENT env var is therefore the authoritative source.
 * Set it to match whatever percentage is configured in your Square Dashboard
 * (Settings → Account & Settings → Payments → Service charges).
 * Returns 0 if the env var is not set or is invalid.
 */
export function getSquareSurchargePercent(): number {
  const val = process.env.SQUARE_SURCHARGE_PERCENT;
  if (!val) return 0;
  const parsed = parseFloat(val);
  return isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

/**
 * Verify that an incoming webhook request genuinely came from Square.
 * Uses Square's official WebhooksHelper (async HMAC-SHA256 check).
 */
export async function verifySquareWebhook(
  rawBody: string,
  signatureHeader: string,
  notificationUrl: string,
): Promise<boolean> {
  if (!SQUARE_WEBHOOK_SIGNATURE_KEY) return false
  try {
    return await WebhooksHelper.verifySignature({
      requestBody: rawBody,
      signatureHeader,
      signatureKey: SQUARE_WEBHOOK_SIGNATURE_KEY,
      notificationUrl,
    })
  } catch {
    return false
  }
}
