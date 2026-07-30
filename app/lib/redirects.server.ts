/**
 * Host-based 301 redirects — every domain other than 103tactical.com lands here.
 *
 * SEO migration for the old WordPress site (103tacticaltraining.com): each old
 * URL 301s to its best-matching page on the new site so Google transfers the
 * old site's ranking page-by-page. Full map + rationale:
 * docs/DOMAIN-MIGRATION-PLAN.md
 *
 * Wired into: root.tsx loader (all document requests), routes/$.tsx (paths
 * that don't exist in this app — i.e. every old WordPress URL), and the
 * robots.txt / sitemap.xml resource routes (root loader doesn't run for
 * resource routes).
 */

const CANONICAL_HOST = "103tactical.com";

/** Old WordPress domains — paths are translated through WP_PATH_MAP. */
const WP_HOSTS = new Set(["103tacticaltraining.com", "www.103tacticaltraining.com"]);

/**
 * Old WordPress path → new site path. Keys are the old path with slashes
 * trimmed and lowercased. Anything unlisted falls through to "/".
 */
const WP_PATH_MAP: Record<string, string> = {
  "": "/",
  "homepage": "/",
  "shop": "/", // the Store page IS the new landing page
  "cart": "/",
  "checkout": "/",
  "my-account": "/",
  "sample-page": "/",
  "ccw-packages": "/courses/nys-ccw-class",
  "book": "/courses",
  "nra-classes": "/courses",
  "private-lessons-classes": "/courses",
  "application-assistance": "/applications",
  "contact-us": "/contact",
};

function isCanonicalHost(host: string): boolean {
  return (
    host === CANONICAL_HOST ||
    host === `www.${CANONICAL_HOST}` || // Render 301s www → apex at the edge
    host.endsWith(".onrender.com") || // Render's direct hostname (health checks)
    host === "localhost" ||
    host.startsWith("localhost:") ||
    host === "127.0.0.1" ||
    host.startsWith("127.0.0.1:")
  );
}

function mapWpPath(pathname: string): string {
  const key = pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
  if (key === "product" || key.startsWith("product/")) return "/"; // products live on the Store page
  if (key === "sitemap.xml" || key.startsWith("wp-sitemap")) return "/sitemap.xml";
  if (key === "robots.txt") return "/robots.txt";
  return WP_PATH_MAP[key] ?? "/";
}

/**
 * Returns the absolute URL to 301 to, or null when the request is already on
 * a host we serve directly.
 */
export function getHostRedirect(request: Request): string | null {
  const url = new URL(request.url);
  const rawHost = request.headers.get("x-forwarded-host") ?? url.host;
  const host = rawHost.split(",")[0].trim().toLowerCase();

  if (isCanonicalHost(host)) return null;

  if (WP_HOSTS.has(host)) {
    return `https://${CANONICAL_HOST}${mapWpPath(url.pathname)}${url.search}`;
  }

  // Any other domain (future parked domains): keep the path as-is.
  return `https://${CANONICAL_HOST}${url.pathname}${url.search}`;
}
