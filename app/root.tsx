import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useLocation,
} from "@remix-run/react";
import type { LinksFunction, MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import siteMetadata from "./data/site-metadata.json";
import { overlayNavRoutes } from "./config/layouts";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AgeGate from "./components/AgeGate";

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

// Replace ADOBE_PROJECT_ID with your Typekit project ID (e.g. "oft5qah")
// Replace font family name in global.css --font-primary once you have it
const ADOBE_PROJECT_ID = "ias2acq";

export const links: LinksFunction = () => [
  ...(ADOBE_PROJECT_ID
    ? [
        { rel: "preconnect" as const, href: "https://use.typekit.net", crossOrigin: "anonymous" as const },
        { rel: "stylesheet" as const, href: `https://use.typekit.net/${ADOBE_PROJECT_ID}.css` },
      ]
    : []),
  { rel: "preconnect" as const, href: "https://fonts.googleapis.com" },
  { rel: "preconnect" as const, href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
  { rel: "stylesheet" as const, href: "https://fonts.googleapis.com/css2?family=Quantico:ital,wght@0,400;0,700;1,400;1,700&display=swap" },
  { rel: "stylesheet", href: globalStyles },
];

/* ── Loader — fetch SiteSettings from Payload ───────────────────────────── */

const FALLBACK_NAV = [
  { label: "Store", url: "/store", openInNewTab: false },
  { label: "Courses", url: "/courses", openInNewTab: false },
  { label: "Applications", url: "/applications", openInNewTab: false },
  { label: "Contact", url: "/contact", openInNewTab: false },
];

interface LoaderData {
  logoStackedColorUrl: string | null;
  logoStackedColorAlt: string | null;
  logoStackedWhiteUrl: string | null;
  logoStackedWhiteAlt: string | null;
  logoWideColorUrl: string | null;
  logoWideColorAlt: string | null;
  logoWideWhiteUrl: string | null;
  logoWideWhiteAlt: string | null;
  footerLogoUrl: string | null;
  footerLogoAlt: string | null;
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

    function resolveUrl(url: string | null | undefined): string | null {
      if (!url) return null;
      return url.startsWith("http") ? url : `${apiUrl}${url}`;
    }

    const logoStackedColorUrl = resolveUrl(settings.logoHeaderStackedColor?.url);
    const logoStackedWhiteUrl = resolveUrl(settings.logoHeaderStackedWhite?.url);
    const logoWideColorUrl    = resolveUrl(settings.logoHeaderWideColor?.url);
    const logoWideWhiteUrl    = resolveUrl(settings.logoHeaderWideWhite?.url);
    const footerLogoUrl       = resolveUrl(settings.logoFooter?.url) ?? logoStackedColorUrl;

    return json<LoaderData>({
      logoStackedColorUrl,
      logoStackedColorAlt: settings.logoHeaderStackedColor?.alt ?? null,
      logoStackedWhiteUrl,
      logoStackedWhiteAlt: settings.logoHeaderStackedWhite?.alt ?? null,
      logoWideColorUrl,
      logoWideColorAlt: settings.logoHeaderWideColor?.alt ?? null,
      logoWideWhiteUrl,
      logoWideWhiteAlt: settings.logoHeaderWideWhite?.alt ?? null,
      footerLogoUrl,
      footerLogoAlt: settings.logoFooter?.alt ?? settings.logoHeaderStackedColor?.alt ?? null,
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
      logoStackedColorUrl: null,
      logoStackedColorAlt: null,
      logoStackedWhiteUrl: null,
      logoStackedWhiteAlt: null,
      logoWideColorUrl: null,
      logoWideColorAlt: null,
      logoWideWhiteUrl: null,
      logoWideWhiteAlt: null,
      footerLogoUrl: null,
      footerLogoAlt: null,
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
  const {
    logoStackedColorUrl, logoStackedColorAlt,
    logoStackedWhiteUrl, logoStackedWhiteAlt,
    logoWideColorUrl, logoWideColorAlt,
    logoWideWhiteUrl, logoWideWhiteAlt,
    footerLogoUrl, footerLogoAlt,
    nav, contact, social, copyright, tagline,
  } = useLoaderData<typeof loader>();
  const { pathname } = useLocation();
  const bodyClass = [
    pathname === "/contact" ? "theme-contact" : null,
    overlayNavRoutes.has(pathname) ? "layout-overlay" : null,
    pathname.startsWith("/print/") ? "layout-print" : null,
  ].filter(Boolean).join(" ") || undefined;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#101010" />
        <Meta />
        <Links />
      </head>
      <body className={bodyClass}>
        <Navbar
          logoStackedColorUrl={logoStackedColorUrl ?? undefined}
          logoStackedColorAlt={logoStackedColorAlt ?? undefined}
          logoStackedWhiteUrl={logoStackedWhiteUrl ?? undefined}
          logoStackedWhiteAlt={logoStackedWhiteAlt ?? undefined}
          logoWideColorUrl={logoWideColorUrl ?? undefined}
          logoWideColorAlt={logoWideColorAlt ?? undefined}
          logoWideWhiteUrl={logoWideWhiteUrl ?? undefined}
          logoWideWhiteAlt={logoWideWhiteAlt ?? undefined}
          nav={nav}
          social={social}
        >
          <main className="site-main">
            <Outlet />
          </main>

          <Footer
            logoUrl={footerLogoUrl ?? undefined}
            logoAlt={footerLogoAlt ?? undefined}
            tagline={tagline ?? undefined}
            nav={nav}
            contact={contact}
            social={social}
            copyright={copyright ?? undefined}
          />
        </Navbar>

        <AgeGate />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
