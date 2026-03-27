import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/node";
import { getApplicationsPage, resolveMediaUrl } from "~/lib/payload";
import { BulletIcon } from "~/components/Icons";
import { buildMeta } from "~/lib/meta";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const seo = data?.page?.seo;
  return buildMeta({
    pageTitle: seo?.title ?? "Applications",
    description: seo?.description ?? "Apply for a firearms license through 103 Tactical. Learn about NYS pistol permit requirements and how to get started.",
    ogImage: seo?.ogImage?.url ? resolveMediaUrl(seo.ogImage.url) : undefined,
    canonicalUrl: data?.canonicalUrl,
  });
};

export async function loader({ request }: LoaderFunctionArgs) {
  const result = await getApplicationsPage().catch(() => null);
  return json({ page: result, canonicalUrl: new URL(request.url).toString() });
}

const ELIGIBILITY = [
  "Must be a New York State resident",
  "Must be 21 years old",
  "Have no prior felony or serious offense convictions",
  "Be of good moral character",
  "Have a legally recognized reason for wanting to possess or carry a firearm",
  "Be ready to open the business for which the license is being applied",
];

const NYC_PERMITS = [
  {
    title: "Pistol Permit",
    body: "New York City residents must obtain a pistol permit to possess a handgun, and applicants must be at least 21. While basic training is not mandatory for premise license applicants, completing the Basic Pistol Safety Course is highly recommended. Completing the NYS Concealed Carry Firearm Safety Training Course and a 2-hour Live Fire Assessment is required for concealed carry license applications.",
    service: "103 Tactical Training offers professional full-service assistance in completing the New York City Pistol Permit Application, including online submission on the NYPD Portal, scanning and uploading personal documents, passport photographs, notary public services, and typed letters of explanation (if necessary). The NYC application and fingerprint fees are covered in our Full-Service Application Assistance.",
  },
  {
    title: "Rifle / Shotgun Permit",
    body: "To own a rifle or shotgun, New York City residents must obtain a Rifle/Shotgun permit. Applicants must be at least 21, despite the state's minimum age requirement of 18.",
    service: "103 Tactical Training offers professional full-service assistance in completing the New York City Rifle/Shotgun Application, including online submission on the NYPD Portal, scanning and uploading personal documents, passport photographs, notary public services, and typed letters of explanation (if necessary). The NYC application and fingerprint fees are included in our Full-Service Application Assistance.",
  },
];

export default function ApplicationsRoute() {
  const { page } = useLoaderData<typeof loader>();
  const heroImageUrl = resolveMediaUrl(page?.heroImage?.url);

  return (
    <section className="applications-page">

      {/* ── Hero ── */}
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

      {/* ── Body ── */}
      <div className="applications-page__body">
        <div className="container">

          {/* ── Lead ── */}
          <div className="applications-page__lead">
            <p className="applications-page__lead-text">
              103 Tactical Training stands at the forefront of assisting individuals in obtaining
              Firearms Licenses, setting the standard for professional full-service support
              unmatched by any other training institution in the New York area.
            </p>
          </div>

          {/* ── Context cards ── */}
          <div className="applications-page__context">
            <div className="applications-page__context-card">
              <h3 className="applications-page__context-heading">New York State Law Changes</h3>
              <p className="applications-page__context-text">
                On September 1, 2022, New York State underwent significant changes in its gun laws,
                impacting firearms training and licensing requisites. These changes introduced
                firearm ownership process complexity, heightened licensing fees, and reduced
                renewal intervals.
              </p>
            </div>
            <div className="applications-page__context-card">
              <h3 className="applications-page__context-heading">Our Commitment to You</h3>
              <p className="applications-page__context-text">
                Despite the evolving intricacies introduced by New York State, 103 Tactical Training
                remains steadfast in its commitment to professionally train and guide our students
                through the licensing procedure. While the state may convolute the process, our
                dedication to simplifying and clarifying the licensing journey remains resolute.
              </p>
              <p className="applications-page__context-note">
                Licensing and training prerequisites may vary from county to county. If you reside
                outside of New York City, please{" "}
                <Link to="/contact" className="applications-page__inline-link">Contact Us</Link>.
              </p>
            </div>
          </div>

          {/* ── Eligibility ── */}
          <div className="applications-page__eligibility">
            <h2 className="applications-page__section-heading">Eligibility Requirements</h2>
            <p className="applications-page__section-sub">
              To apply for a firearms license in New York State / City, you must meet all of the
              following criteria:
            </p>
            <ul className="applications-page__bullets">
              {ELIGIBILITY.map((item, i) => (
                <li key={i} className="applications-page__bullet">
                  <BulletIcon className="applications-page__bullet-icon" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* ── NYC Permits ── */}
          <div className="applications-page__nyc">
            <h2 className="applications-page__section-heading">For New York City Residents</h2>
            <p className="applications-page__section-sub">
              Applicants can simultaneously apply for pistol, rifle, and shotgun licenses — a
              common practice among most applicants.
            </p>
            <div className="applications-page__permits">
              {NYC_PERMITS.map((permit) => (
                <div key={permit.title} className="applications-page__permit-card">
                  <h3 className="applications-page__permit-title">{permit.title}</h3>
                  <p className="applications-page__permit-body">{permit.body}</p>
                  <div className="applications-page__permit-service">
                    <span className="applications-page__permit-service-label">Full-Service Assistance</span>
                    <p className="applications-page__permit-service-text">{permit.service}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
