import type { LoaderFunctionArgs } from "@remix-run/node";
import { getAllCourses, PAYLOAD_API_URL } from "~/lib/payload";

const SITE_URL =
  typeof process !== "undefined" && process.env.PUBLIC_SITE_URL
    ? process.env.PUBLIC_SITE_URL
    : "https://one03tactical-training-website.onrender.com";

function urlEntry(loc: string, priority: string, changefreq: string): string {
  return `  <url>
    <loc>${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export async function loader(_: LoaderFunctionArgs) {
  // Fetch active courses for individual course URLs
  let courseSlugs: string[] = [];
  try {
    const result = await getAllCourses();
    courseSlugs = result.docs.map((c) => c.slug).filter(Boolean);
  } catch {
    // Non-fatal — sitemap will still be generated without course URLs
  }

  const staticPages = [
    { path: "/",            priority: "1.0", freq: "weekly"  },
    { path: "/courses",     priority: "0.9", freq: "weekly"  },
    { path: "/store",       priority: "0.8", freq: "monthly" },
    { path: "/applications",priority: "0.7", freq: "monthly" },
    { path: "/contact",     priority: "0.7", freq: "monthly" },
  ];

  const entries = [
    ...staticPages.map(({ path, priority, freq }) =>
      urlEntry(`${SITE_URL}${path}`, priority, freq)
    ),
    ...courseSlugs.map((slug) =>
      urlEntry(`${SITE_URL}/courses/${slug}`, "0.8", "weekly")
    ),
    ...courseSlugs.map((slug) =>
      urlEntry(`${SITE_URL}/courses/${slug}/schedule`, "0.7", "weekly")
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
