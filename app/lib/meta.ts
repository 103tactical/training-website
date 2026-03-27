/**
 * Builds a complete set of meta descriptors for Remix routes, covering:
 *   - HTML <title> and <meta name="description">
 *   - Open Graph (og:*) — used by Facebook, LinkedIn, iMessage, Apple Mail,
 *     WhatsApp, Slack, and any OG-compliant client
 *   - Twitter Card — used by X/Twitter and some OG fallback clients
 *   - Canonical <link>
 *
 * All fields are optional; only tags with values are emitted.
 */
export interface BuildMetaOptions {
  /** Page-specific title, e.g. "Courses". Do not include the site name. */
  pageTitle?: string;
  /** The site name suffix, e.g. "103 Tactical Training". */
  siteName?: string;
  /** Meta description shown in search results and social previews. */
  description?: string;
  /** Absolute URL for the social share image (1200×630 recommended). */
  ogImage?: string;
  /** Full canonical URL for this page. */
  canonicalUrl?: string;
  /** og:type — defaults to "website". Use "article" for blog posts, etc. */
  ogType?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MetaDescriptor = Record<string, any>;

export function buildMeta({
  pageTitle,
  siteName = "103 Tactical",
  description,
  ogImage,
  canonicalUrl,
  ogType = "website",
}: BuildMetaOptions): MetaDescriptor[] {
  const fullTitle = pageTitle ? `${pageTitle} | ${siteName}` : siteName;
  const tags: MetaDescriptor[] = [];

  // ── <title> ───────────────────────────────────────────────────────────────
  tags.push({ title: fullTitle });

  // ── Standard meta ────────────────────────────────────────────────────────
  if (description) {
    tags.push({ name: "description", content: description });
  }

  // ── Open Graph ───────────────────────────────────────────────────────────
  tags.push({ property: "og:type",      content: ogType });
  tags.push({ property: "og:site_name", content: siteName });
  tags.push({ property: "og:title",     content: fullTitle });
  tags.push({ property: "og:locale",    content: "en_US" });

  if (description) {
    tags.push({ property: "og:description", content: description });
  }
  if (canonicalUrl) {
    tags.push({ property: "og:url", content: canonicalUrl });
  }
  if (ogImage) {
    tags.push({ property: "og:image",        content: ogImage });
    tags.push({ property: "og:image:width",  content: "1200" });
    tags.push({ property: "og:image:height", content: "630" });
    tags.push({ property: "og:image:alt",    content: fullTitle });
  }

  // ── Twitter Card ─────────────────────────────────────────────────────────
  tags.push({ name: "twitter:card",  content: ogImage ? "summary_large_image" : "summary" });
  tags.push({ name: "twitter:title", content: fullTitle });
  if (description) {
    tags.push({ name: "twitter:description", content: description });
  }
  if (ogImage) {
    tags.push({ name: "twitter:image", content: ogImage });
  }

  // ── Canonical ─────────────────────────────────────────────────────────────
  if (canonicalUrl) {
    tags.push({ tagName: "link", rel: "canonical", href: canonicalUrl });
  }

  return tags;
}
