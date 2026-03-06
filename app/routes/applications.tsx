import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/node";
import { getApplicationsPage, resolveMediaUrl } from "~/lib/payload";

export const meta: MetaFunction = () => [
  { title: "Applications | 103 Tactical Training" },
];

export async function loader(_: LoaderFunctionArgs) {
  const result = await getApplicationsPage().catch(() => null);
  return json({ page: result });
}

export default function ApplicationsRoute() {
  const { page } = useLoaderData<typeof loader>();
  const heroImageUrl = resolveMediaUrl(page?.heroImage?.url);

  return (
    <section className="applications-page">
      <div className="contact-page__hero courses-page__hero">
        {heroImageUrl && (
          <img
            className="contact-page__hero-img"
            src={heroImageUrl}
            alt={page?.heroImage?.alt ?? "Applications"}
          />
        )}
        {(page?.header?.title || page?.header?.subtext) && (
          <div className="contact-page__hero-content courses-page__hero-content">
            {page?.header?.title && (
              <h1 className="contact-page__title">{page.header.title}</h1>
            )}
            {page?.header?.subtext && (
              <p className="contact-page__subtitle">{page.header.subtext}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
