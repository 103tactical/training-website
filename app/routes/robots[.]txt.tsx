import type { LoaderFunctionArgs } from "@remix-run/node";

const SITE_URL =
  typeof process !== "undefined" && process.env.PUBLIC_SITE_URL
    ? process.env.PUBLIC_SITE_URL
    : "https://one03tactical-training-website.onrender.com";

export async function loader(_: LoaderFunctionArgs) {
  const content = `User-agent: *
Allow: /

# Disallow admin and print routes
Disallow: /print/

Sitemap: ${SITE_URL}/sitemap.xml
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
