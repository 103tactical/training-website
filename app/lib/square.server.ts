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
// Priority order:
//   1. SQUARE_SURCHARGE_PERCENT env var (explicit, always wins if set)
//   2. Square Catalog API — SERVICE_CHARGE items (cached 10 min)
//   3. 0 (no surcharge)

let _surchargeCache: { percent: number; expiresAt: number } | null = null;
const SURCHARGE_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Returns the credit-card surcharge percentage to apply at checkout.
 *
 * Source of truth is the Square Catalog API (SERVICE_CHARGE items filtered to
 * the booking location). Result is cached for 10 minutes.
 * Falls back to SQUARE_SURCHARGE_PERCENT env var only if the API is unavailable,
 * and to 0 if neither yields a value.
 */
export async function getSquareSurchargePercent(): Promise<number> {
  // Return cached value if still fresh.
  if (_surchargeCache && Date.now() < _surchargeCache.expiresAt) {
    return _surchargeCache.percent;
  }

  const envFallback = process.env.SQUARE_SURCHARGE_PERCENT
    ? parseFloat(process.env.SQUARE_SURCHARGE_PERCENT)
    : NaN;

  if (!squareClient) {
    return !isNaN(envFallback) ? envFallback : 0;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page = await squareClient.catalog.list({ types: 'SERVICE_CHARGE' } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objects: any[] = page.data ?? [];

    console.log(`[Square] catalog.list SERVICE_CHARGE returned ${objects.length} object(s)`);
    if (objects.length > 0) {
      console.log('[Square] service charge objects:', JSON.stringify(objects.map((o: any) => ({
        id: o.id,
        type: o.type,
        isDeleted: o.isDeleted,
        serviceChargeData: o.serviceChargeData,
      })), null, 2));
    }

    // Filter to charges that are active AND apply to our booking location.
    // CatalogObjects use presentAtAllLocations (default true) / presentAtLocationIds
    // / absentAtLocationIds for location scoping.
    const locationId = SQUARE_LOCATION_ID;
    const charge = objects.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (obj: any) => {
        if (obj.type !== 'SERVICE_CHARGE') return false;
        if (obj.isDeleted) return false;
        if (obj.serviceChargeData?.percentage == null) return false;

        // Location check
        const presentAtAll = obj.presentAtAllLocations !== false; // defaults to true
        const absentIds: string[] = obj.absentAtLocationIds ?? [];
        const presentIds: string[] = obj.presentAtLocationIds ?? [];

        if (presentAtAll) {
          return !absentIds.includes(locationId);
        }
        return presentIds.includes(locationId);
      },
    );

    if (charge) {
      const pct = parseFloat(charge.serviceChargeData.percentage);
      if (!isNaN(pct) && pct > 0) {
        console.log(`[Square] Using catalog service charge: ${pct}%`);
        _surchargeCache = { percent: pct, expiresAt: Date.now() + SURCHARGE_CACHE_TTL_MS };
        return pct;
      }
    }

    console.warn('[Square] No active percentage-based SERVICE_CHARGE found in catalog for this location.');
  } catch (err) {
    console.warn('[Square] Could not fetch service charges from catalog:', err);
  }

  // Env var is only a fallback when the catalog API is unavailable or returns nothing.
  if (!isNaN(envFallback) && envFallback > 0) {
    console.warn(`[Square] Using SQUARE_SURCHARGE_PERCENT env fallback: ${envFallback}%`);
    return envFallback;
  }

  return 0;
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
