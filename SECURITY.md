# Security Notes — 103 Tactical Training Website

Last reviewed: March 2026  
Author: AI-assisted audit (Cursor)

---

## Overview

This document records the security posture of the site at launch, known limitations, and items to revisit. It is not public-facing — keep it out of any public wiki.

---

## What Is Secure (Do Not Change Without Understanding Why)

### Payment Processing — PCI Compliance
- **No card data ever touches our servers.** Square hosts the entire checkout page. We create a Payment Link and redirect the user. The only thing we store is the Square Order ID, Payment ID, and amount paid in cents — all post-payment metadata, not card data.
- This means we are **outside PCI-DSS scope** for card handling, which is the desired state. Do not add any form fields that accept card numbers, CVV, or expiry dates.

### Webhook Authenticity (Square → Our Server)
- Every incoming webhook from Square is verified using HMAC-SHA256 with `SQUARE_WEBHOOK_SIGNATURE_KEY` before any processing happens.
- If the key is missing in a production environment, the endpoint returns `503` and rejects all traffic rather than silently accepting unverified requests.
- Sandbox/dev bypass: only allowed when `SQUARE_ENVIRONMENT=sandbox` **and** the signature key is explicitly absent. Never allow this in production.

### Inter-Service Authentication (Remix → Payload CMS)
- The website backend authenticates to the CMS REST API using a shared `CMS_WRITE_SECRET` bearer token.
- Comparison uses `crypto.timingSafeEqual()` (constant-time) to prevent timing-based secret extraction.
- The secret is never sent to the browser — it only lives in server-side environment variables.

### PII Access Control (Attendees & Bookings)
- The `Attendees` and `Bookings` Payload collections are **not publicly readable**.
- Read, create, and update all require either an active admin session cookie or the `CMS_WRITE_SECRET` bearer token.
- This prevents anyone from hitting `https://training-cms.onrender.com/api/attendees` and dumping the entire attendee list.
- Course/Schedule data remains fully public (needed for the booking form and schedule page).

### SQL Injection
- Payload CMS uses Drizzle ORM with parameterized queries throughout. No raw SQL string concatenation is used anywhere in the application code.

### XSS (Cross-Site Scripting)
- Remix/React escapes all dynamic content at render time. There is no use of `dangerouslySetInnerHTML` anywhere in the codebase.

### HTTPS
- Enforced by Render on both services (website + CMS). All traffic between browser ↔ server and server ↔ CMS is encrypted in transit.

### Security Headers (applied to every HTML response)
| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Blocks the site from being embedded in an iframe (clickjacking) |
| `X-Content-Type-Options` | `nosniff` | Prevents browsers from guessing MIME types |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Booking/session URLs don't leak in Referer header |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables browser APIs this site never uses |

### CSRF Protection
- Remix form actions operate on `POST` requests with standard content types. Browsers enforce same-origin policy on form submissions, blocking cross-site forgery. No additional CSRF token is required for this architecture.

### Duplicate Booking / Overbooking Prevention
- The `squareOrderId` idempotency check in the webhook handler prevents any payment from creating more than one booking.
- The `beforeChange` hook in the CMS validates seat availability before every save, preventing overbooking from both the admin UI and the API.

### Environment Variables
- `.env` is in `.gitignore` and confirmed NOT committed to the git repository.
- All secrets are set via the Render dashboard environment variables panel (not in code).

---

## Known Limitations / Future Improvements

### 1. Rate Limiting — Medium Priority
**Risk**: The `/book/:scheduleId` form and `/api/square-webhook` endpoints have no per-IP rate limiting. A determined attacker could spam the booking form to enumerate schedules or consume server resources.  
**Why not done yet**: True rate limiting requires Redis (for a distributed counter) or a CDN layer. Neither is in the current infrastructure.  
**Future fix**: Add Cloudflare (free tier) in front of the Render services. Cloudflare provides automatic DDoS mitigation, bot protection, and rate limiting with no code changes required. Alternatively, a Redis-backed rate limiter middleware can be added to Remix.

### 2. Booking Confirmation Info Disclosure — Low Priority
**Risk**: `/booking-confirmation?orderId=XXXXX` displays order details (course name, amount, date) for any Square Order ID passed as a query param. Someone who guesses or observes a valid Order ID could view confirmation details.  
**Why acceptable**: Square Order IDs are unpredictable UUID-format strings (~120 bits of entropy). Brute-force guessing is computationally infeasible.  
**Future fix**: Store a short-lived confirmation token (e.g., UUID in session or database) when the webhook creates the booking, and validate that token on the confirmation page instead of the Square Order ID.

### 3. Content Security Policy (CSP) — Medium Priority
**Risk**: Without a CSP header, any injected script (from a compromised CDN or browser extension) has full access to the page.  
**Why not done yet**: Implementing CSP requires carefully auditing every external resource (Adobe Typekit, Google Analytics gtag.js, Square's hosted checkout redirect) and is easy to misconfigure in a way that breaks the site.  
**Future fix**: Start with `Content-Security-Policy-Report-Only` to observe violations without breaking anything, then tighten incrementally. Key directives needed: `script-src` (GA, Typekit), `style-src` (Typekit), `frame-ancestors 'none'` (replaces X-Frame-Options), `connect-src` (API calls).

### 4. Webhook Reliability — Medium Priority (discussed separately)
**Risk**: If our server returns `200` but internal processing fails silently (DB write error), the booking is never created and Square won't retry.  
**Plan**: Implement a periodic reconciliation endpoint (`/api/sync-bookings`) that queries Square for recent completed payments and creates any missing bookings. Call it every 15-30 minutes via an external cron service (e.g., cron-job.org, Render cron jobs).

### 5. Admin Password Strength — Reminder
The Payload CMS admin login (`/admin`) is the highest-privilege entry point. Ensure:
- Password is unique, at least 20 characters
- Not reused from any other service
- Consider enabling Payload's built-in brute-force protection (it locks accounts after repeated failures — verify this is active)

### 6. Attendee Email Uniqueness Not Enforced at DB Level
**Risk**: Two bookings could exist for the same email under different Attendee records if an edge case bypasses the `findAttendeeByEmail` lookup (e.g., race condition at high load).  
**Current mitigation**: The webhook handler and booking form both call `findAttendeeByEmail` before creating a new Attendee. In practice, load is low enough that this race is extremely unlikely.  
**Future fix**: Add a unique constraint on the `email` column in the `attendees` Postgres table via a Payload migration.

### 7. Square Access Token Rotation
Square access tokens do not expire by default (production tokens are long-lived). However, you should:
- Rotate the token if any employee with access to the Square Developer Dashboard leaves
- Store it only in Render's environment variables — never in code, config files, or Slack/email
- Review the Square Developer Dashboard > OAuth Apps > Permissions to confirm only the minimum required permissions are granted

---

## Environment Variables Quick Reference

| Variable | Service(s) | Purpose |
|----------|-----------|---------|
| `SQUARE_ACCESS_TOKEN` | website + cms | Square API calls and refunds |
| `SQUARE_LOCATION_ID` | website | Identifies which Square location processes payments |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | website | Verifies webhook authenticity |
| `SQUARE_ENVIRONMENT` | website + cms | `production` or `sandbox` |
| `CMS_WRITE_SECRET` | website + cms | **Must be identical on both.** Inter-service auth. Generate with: `openssl rand -hex 32` |
| `PRINT_SECRET` | website | Guards the `/print/roster/:id` route. Set a unique value in production — do not reuse the dev value. |
| `PAYLOAD_API_URL` | website | Points to the CMS service URL |
| `PUBLIC_SITE_URL` | website + cms | Used for canonical URLs and webhook URL construction |

---

## Incident Response (If Something Goes Wrong)

1. **Suspected breach of CMS_WRITE_SECRET**: Immediately rotate it in both Render services simultaneously. All in-flight booking requests will fail momentarily, then recover.
2. **Suspected breach of Square Access Token**: Revoke it in the Square Developer Dashboard and generate a new one. Update `SQUARE_ACCESS_TOKEN` in Render. Existing bookings are unaffected.
3. **Fake bookings detected**: Check Render logs for the `/api/square-webhook` endpoint. If `SQUARE_WEBHOOK_SIGNATURE_KEY` is correct, forged requests cannot pass. If fake bookings exist, they were created via the admin UI (insider) or the secret was compromised.
4. **Data breach of attendee PII**: Notify affected individuals per applicable law. Audit Render access logs and Payload admin activity logs. Rotate `CMS_WRITE_SECRET`.
