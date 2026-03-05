import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import type { LinksFunction, MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import siteMetadata from "./data/site-metadata.json";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import globalStyles from "./styles/global.css?url";

const { seo, site } = siteMetadata;

/* ── Meta ───────────────────────────────────────────────────────────────── */

export const meta: MetaFunction = () => {
  const title = seo.defaultTitle;
  const description = seo.defaultDescription;
  const keywords = Array.isArray(seo.defaultKeywords)
    ? seo.defaultKeywords.join(", ")
    : "";

  return [
    { title },
    { name: "description", content: description },
    { name: "keywords", content: keywords },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: site.url },
    { property: "og:locale", content: site.locale },
    ...(seo.ogImage ? [{ property: "og:image", content: seo.ogImage }] : []),
    { name: "twitter:card", content: seo.twitterCard },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];
};

/* ── Links ──────────────────────────────────────────────────────────────── */

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: globalStyles },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
];

/* ── Loader — fetch SiteSettings from Payload ───────────────────────────── */

const FALLBACK_NAV = [
  { label: "Courses", url: "/courses", openInNewTab: false },
  { label: "Application Assistance", url: "/application-assistance", openInNewTab: false },
  { label: "Contact Us", url: "/contact", openInNewTab: false },
];

interface LoaderData {
  logoUrl: string | null;
  logoAlt: string | null;
  nav: { label: string; url: string; openInNewTab: boolean }[];
  contact: { address?: string; city?: string; phone?: string; email?: string };
  social: { platform: string; url: string }[];
  copyright: string | null;
  tagline: string | null;
}

export async function loader(_: LoaderFunctionArgs) {
  try {
    const apiUrl = process.env.PAYLOAD_API_URL ?? "https://training-cms.onrender.com";
    const res = await fetch(`${apiUrl}/api/globals/site-settings`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) throw new Error(`CMS responded ${res.status}`);

    const settings = await res.json();

    return json<LoaderData>({
      logoUrl: settings.logo?.url ?? null,
      logoAlt: settings.logo?.alt ?? null,
      nav: Array.isArray(settings.nav) && settings.nav.length > 0
        ? settings.nav
        : FALLBACK_NAV,
      contact: settings.contact ?? {},
      social: Array.isArray(settings.social) ? settings.social : [],
      copyright: settings.copyright ?? null,
      tagline: settings.tagline ?? null,
    });
  } catch {
    return json<LoaderData>({
      logoUrl: null,
      logoAlt: null,
      nav: FALLBACK_NAV,
      contact: {},
      social: [],
      copyright: null,
      tagline: null,
    });
  }
}

/* ── Root component ─────────────────────────────────────────────────────── */

export default function App() {
  const { logoUrl, logoAlt, nav, contact, social, copyright, tagline } =
    useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Navbar
          logoUrl={logoUrl ?? undefined}
          logoAlt={logoAlt ?? undefined}
          nav={nav}
          social={social}
        />

        <main className="site-main">
          <Outlet />
        </main>

        <Footer
          logoUrl={logoUrl ?? undefined}
          logoAlt={logoAlt ?? undefined}
          tagline={tagline ?? undefined}
          nav={nav}
          contact={contact}
          social={social}
          copyright={copyright ?? undefined}
        />

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
