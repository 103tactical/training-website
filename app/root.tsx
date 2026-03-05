import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { LinksFunction, MetaFunction } from "@remix-run/node";

import siteMetadata from "./data/site-metadata.json";

const { seo, site } = siteMetadata;

export const links: LinksFunction = () => [];

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

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
