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

// ── Surcharge cache ───────────────────────────────────────────────────────────
// Fetched from Square's catalog once every 10 minutes so we don't hammer the
// API on every page load, but changes in the Square dashboard propagate quickly.

let _surchargeCache: { percent: number; expiresAt: number } | null = null;
const SURCHARGE_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Returns the surcharge percentage configured in the Square dashboard
 * (Settings → Service Charges → first active percentage-based charge).
 *
 * Falls back to the SQUARE_SURCHARGE_PERCENT env var if the catalog API is
 * unavailable or returns no matching charge, and to 0 if neither is set.
 */
export async function getSquareSurchargePercent(): Promise<number> {
  if (_surchargeCache && Date.now() < _surchargeCache.expiresAt) {
    return _surchargeCache.percent;
  }

  const envFallback = parseFloat(process.env.SQUARE_SURCHARGE_PERCENT ?? "0");

  if (!squareClient) return envFallback;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page = await squareClient.catalog.list({ types: 'SERVICE_CHARGE' } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objects: any[] = page.data ?? [];

    const charge = objects.find(
      (obj) =>
        obj.type === 'SERVICE_CHARGE' &&
        !obj.isDeleted &&
        obj.serviceChargeData?.percentage != null,
    );

    if (charge) {
      const pct = parseFloat(charge.serviceChargeData.percentage);
      if (!isNaN(pct) && pct > 0) {
        _surchargeCache = { percent: pct, expiresAt: Date.now() + SURCHARGE_CACHE_TTL_MS };
        return pct;
      }
    }
  } catch (err) {
    console.warn('[Square] Could not fetch service charges from catalog:', err);
  }

  return envFallback;
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
