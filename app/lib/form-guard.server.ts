import crypto from "crypto";

/**
 * Lightweight anti-bot guards for the public forms (contact + booking).
 * Two layers, both invisible to real visitors:
 *
 *  1. Time trap — the loader issues an HMAC-signed timestamp token that the
 *     form echoes back in a hidden field. A submission arriving faster than a
 *     human could possibly fill the form (or with a missing/forged token —
 *     i.e. a bot POSTing without ever loading the page) is rejected before
 *     anything is stored, emailed, or sent to Square.
 *
 *  2. Per-IP submission throttle — in-memory counters, same pattern as the
 *     discount-code throttle: the site runs as a single Render instance, and
 *     counters resetting on deploy is harmless.
 *
 * Deliberately NOT a CAPTCHA (standing rule) and NOT a honeypot field
 * (screen-reader/autofill footprint for marginal gain over the time trap).
 */

const SECRET = process.env.CMS_WRITE_SECRET ?? "";

// Humans take far longer than this to fill any of our forms; bots that GET
// the page and POST immediately do not.
const MIN_FORM_AGE_MS = 3_000;
// Generous ceiling so a tab left open all weekend still submits fine, while
// harvested tokens eventually expire.
const MAX_FORM_AGE_MS = 48 * 60 * 60 * 1000;

function sign(ts: string): string {
  return crypto.createHmac("sha256", `form-token:${SECRET}`).update(ts).digest("hex").slice(0, 32);
}

/** Issued by loaders; rendered into a hidden form field. */
export function issueFormToken(): string {
  const ts = Date.now().toString();
  return `${ts}.${sign(ts)}`;
}

/**
 * Verdict on an echoed token. Only "ok" should proceed.
 * If the secret is unset (local dev without env), fail open — these guards
 * must never be the reason a real visitor can't reach us.
 */
export function checkFormToken(token: string | null | undefined): "ok" | "rejected" {
  if (!SECRET) return "ok";
  if (!token) return "rejected";
  const dot = token.indexOf(".");
  if (dot <= 0) return "rejected";
  const ts = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  if (!/^\d{10,16}$/.test(ts)) return "rejected";
  const expected = sign(ts);
  if (
    mac.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))
  ) {
    return "rejected";
  }
  const age = Date.now() - Number(ts);
  if (age < MIN_FORM_AGE_MS || age > MAX_FORM_AGE_MS) return "rejected";
  return "ok";
}

/** Friendly copy for a rejected token — refreshing re-issues a valid one. */
export const FORM_TOKEN_MESSAGE =
  "Something went wrong sending the form — please refresh the page and try again.";

/**
 * Per-IP sliding-window throttle factory (fixed window, opportunistic
 * cleanup). Returns true when the request is within limits.
 */
export function createIpThrottle(windowMs: number, maxAttempts: number) {
  const attempts = new Map<string, { count: number; windowStart: number }>();
  return function allowed(request: Request): boolean {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const now = Date.now();
    const entry = attempts.get(ip);
    if (!entry || now - entry.windowStart > windowMs) {
      if (attempts.size > 5000) {
        for (const [k, v] of attempts) {
          if (now - v.windowStart > windowMs) attempts.delete(k);
        }
      }
      attempts.set(ip, { count: 1, windowStart: now });
      return true;
    }
    entry.count += 1;
    return entry.count <= maxAttempts;
  };
}
