import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { useState, useCallback, useEffect } from "react";
import { getContactSettings, getSiteSettings, PAYLOAD_API_URL, resolveMediaUrl } from "~/lib/payload";
import { PhoneIcon, EmailIcon, LocationIcon } from "~/components/Icons";
import { buildMeta, getRootSeoDefaults } from "~/lib/meta";
import { trackContactFormSubmit } from "~/lib/analytics";
import { sendAdminContactFormEmail } from "~/lib/email.server";
import { createCmsNotification } from "~/lib/cms-notify.server";
import { normalizeUSPhone, PHONE_ERROR } from "~/lib/phone";
import { issueFormToken, checkFormToken, createIpThrottle, FORM_TOKEN_MESSAGE } from "~/lib/form-guard.server";

// Contact-form spam guard: nobody legitimately sends more than a handful of
// messages — bots do. 5 submissions per 10 minutes per IP.
const contactAllowed = createIpThrottle(10 * 60 * 1000, 5, "contact");

export const meta: MetaFunction<typeof loader> = ({ data, matches }) => {
  const { defaultOgImage, defaultSiteName } = getRootSeoDefaults(matches);
  const tags = buildMeta({
    pageTitle: data?.seoTitle ?? "Contact",
    siteName: defaultSiteName ?? "103 Tactical",
    description: data?.seoDescription ?? "Get in touch with 103 Tactical. We're located on Staten Island, NY. Ask about courses, licensing, and firearm services.",
    ogImage: data?.seoOgImage ? resolveMediaUrl(data.seoOgImage) : defaultOgImage,
    canonicalUrl: data?.canonicalUrl,
  });

  // LocalBusiness structured data — feeds Google's local results / knowledge
  // panel. Contact details come live from Site Settings.
  tags.push({
    "script:ld+json": {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: defaultSiteName ?? "103 Tactical",
      url: "https://103tactical.com/",
      ...(data?.phone && { telephone: data.phone }),
      ...(data?.email && { email: data.email }),
      ...(data?.address && {
        address: {
          "@type": "PostalAddress",
          streetAddress: data.address,
          ...(data?.city && { addressLocality: data.city }),
          addressRegion: "NY",
          addressCountry: "US",
        },
      }),
    },
  });

  return tags;
};

/* ── Loader — fetch topics from CMS ─────────────────────────────────────── */

export async function loader({ request }: LoaderFunctionArgs) {
  const [contactSettings, siteSettings] = await Promise.allSettled([
    getContactSettings(),
    getSiteSettings(),
  ]);

  const cs = contactSettings.status === "fulfilled" ? contactSettings.value : null;
  const ss = siteSettings.status   === "fulfilled" ? siteSettings.value   : null;

  return json({
    topics:       cs?.topics       ?? [],
    heroImageUrl: cs?.heroImage?.url ?? null,
    heroImageAlt: cs?.heroImage?.alt ?? "Contact Us",
    phone:        ss?.contact?.phone   ?? null,
    email:        ss?.contact?.email   ?? null,
    address:      ss?.contact?.address ?? null,
    city:         ss?.contact?.city    ?? null,
    seoTitle:       cs?.seo?.title       ?? null,
    seoDescription: cs?.seo?.description ?? null,
    seoOgImage:     cs?.seo?.ogImage?.url ?? null,
    canonicalUrl: new URL(request.url).toString(),
    formToken: issueFormToken(),
  });
}

/* ── Action — validate + submit to Payload ──────────────────────────────── */

type ContactActionData = {
  success: boolean;
  errors: Partial<Record<"name" | "email" | "phone" | "topic" | "form", string>>;
};

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const name    = (formData.get("name")    as string | null)?.trim() ?? "";
  const email   = (formData.get("email")   as string | null)?.trim() ?? "";
  const phone   = (formData.get("phone")   as string | null)?.trim() ?? "";
  const topic   = (formData.get("topic")   as string | null)?.trim() ?? "";
  const message = (formData.get("message") as string | null)?.trim() ?? "";

  const normalizedPhone = phone ? normalizeUSPhone(phone) : null;

  const errors: ContactActionData["errors"] = {};
  if (!name)                                          errors.name  = "Name is required.";
  else if (name.length > 200)                         errors.name  = "Name is too long.";
  if (!email)                                         errors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Please enter a valid email address.";
  else if (email.length > 254)                        errors.email = "Email is too long.";
  if (!phone)                                         errors.phone = "Phone number is required.";
  else if (!normalizedPhone)                          errors.phone = PHONE_ERROR;
  if (!topic || topic.length > 100)                   errors.topic = "Please select a topic.";
  if (message.length > 5000)                          errors.form  = "Message is too long — please keep it under 5,000 characters.";

  if (Object.keys(errors).length > 0) {
    return json<ContactActionData>({ success: false, errors }, { status: 400 });
  }

  // ── Spam guards — AFTER validation so an incomplete human submission gets
  // its field errors and never consumes a throttle slot; checked before
  // anything is stored or emailed. ─────────────────────────────────────────
  if (!contactAllowed(request)) {
    return json<ContactActionData>(
      { success: false, errors: { form: "Too many messages sent — please wait a few minutes and try again." } },
      { status: 429 },
    );
  }
  // Time trap: a submission faster than a human could type, or missing the
  // token the page renders (a bot POSTing without loading the page), is
  // rejected with a refresh prompt. Refreshing issues a fresh valid token.
  if (checkFormToken(formData.get("formToken") as string | null) !== "ok") {
    return json<ContactActionData>(
      { success: false, errors: { form: FORM_TOKEN_MESSAGE } },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${PAYLOAD_API_URL}/api/contact-submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CMS_WRITE_SECRET}`,
      },
      body: JSON.stringify({ name, email, phone: normalizedPhone, topic, message }),
    });
    if (!res.ok) throw new Error(`Payload responded with ${res.status}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const created: any = await res.json().catch(() => null);
    const submissionId = created?.doc?.id ?? undefined;

    // Notify admin — non-fatal, never block the success response
    sendAdminContactFormEmail({ name, email, phone, topic, message, submissionId }).catch((err) => {
      console.error("Admin contact form notification failed:", err);
    });

    // Dashboard notification — a reminder in case the email gets missed
    const inbox = process.env.ADMIN_EMAIL?.trim() || "info@103tactical.com";
    createCmsNotification({
      whatHappened: `${name} (${email}) sent a message through the website's contact form.`,
      whatToDo: `Read and reply to it from the ${inbox} inbox. Already saw it there? Just dismiss.`,
      ...(submissionId
        ? {
            link: `/admin/collections/contact-submissions/${submissionId}`,
            linkLabel: "View the message",
          }
        : {}),
    }).catch(() => {});

    return json<ContactActionData>({ success: true, errors: {} });
  } catch (err) {
    console.error("Contact form submission error:", err);
    return json<ContactActionData>(
      { success: false, errors: { form: "Something went wrong. Please try again." } },
      { status: 500 }
    );
  }
}

/* ── Component ───────────────────────────────────────────────────────────── */

export default function Contact() {
  const { topics, heroImageUrl, heroImageAlt, phone, email, address, city, formToken } =
    useLoaderData<typeof loader>();
  const actionData   = useActionData<typeof action>();
  const navigation   = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Track which fields have been interacted with so we only show
  // errors after the user has touched a field or attempted submit.
  const [attempted, setAttempted] = useState(false);
  const [phoneValue, setPhoneValue] = useState("");
  // Pin the anti-bot token to the FIRST page load: revalidation after a
  // validation error would otherwise hand the form a brand-new token, and a
  // visitor who fixes a typo within seconds would trip the time trap.
  const [formTokenValue] = useState(formToken);

  const formatPhone = useCallback((raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    if (digits.length < 4) return digits;
    if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }, []);

  const serverErrors = actionData?.errors ?? {};
  const success      = actionData?.success === true;

  // Fire once when the form submission succeeds
  useEffect(() => {
    if (success) {
      const form = document.querySelector<HTMLFormElement>("form");
      const topic = form?.querySelector<HTMLSelectElement>("[name='topic']")?.value ?? "unknown";
      trackContactFormSubmit(topic);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    setAttempted(true);
    // Let Remix handle the actual submission — just flag that submit was attempted
    // so client-side error classes activate on all fields simultaneously.
  }

  return (
    <section className="contact-page">
      <div className="contact-page__hero">
        {heroImageUrl && (
          <img
            src={heroImageUrl}
            alt={heroImageAlt}
            className="contact-page__hero-img"
          />
        )}
        <div className="contact-page__hero-content">
          <h1 className="contact-page__title">Contact Us</h1>
          <p className="contact-page__subtitle">We&rsquo;re here to help.</p>
        </div>
      </div>

      <div className="contact-page__body">

        {/* ── Left: contact info ─────────────────────────────────────────── */}
        <div className="contact-info">
          {phone && (
            <div className="contact-info__item">
              <p className="contact-info__label">Call Us</p>
              <a
                href={(() => { const d = phone.replace(/\D/g, ""); return `tel:${d.length === 10 ? `+1${d}` : `+${d}`}`; })()}
                className="contact-info__value"
              >
                <PhoneIcon className="contact-info__icon" />
                {phone}
              </a>
            </div>
          )}
          {email && (
            <div className="contact-info__item">
              <p className="contact-info__label">Email Us</p>
              <a href={`mailto:${email}`} className="contact-info__value">
                <EmailIcon className="contact-info__icon" />
                {email}
              </a>
            </div>
          )}
          {(address || city) && (
            <div className="contact-info__item">
              <p className="contact-info__label">Location</p>
              <div className="contact-info__value contact-info__value--address">
                <LocationIcon className="contact-info__icon contact-info__icon--top" />
                <span>
                  {address && <span className="contact-info__address-line">{address}</span>}
                  {city    && <span className="contact-info__address-line">{city}</span>}
                </span>
              </div>
            </div>
          )}

          {/* ── Map embed ──────────────────────────────────────────────── */}
          {(address || city) && (
            <div className="contact-map">
              <iframe
                title="Location map"
                className="contact-map__iframe"
                src={`https://maps.google.com/maps?q=${encodeURIComponent([address, city].filter(Boolean).join(", "))}&output=embed&z=15`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
        </div>

        {/* ── Right: form ────────────────────────────────────────────────── */}
        <div className={`contact-form-wrap${success ? " contact-form-wrap--success" : ""}`}>
          {success ? (
            <div className="contact-form__success">
              <h2 className="contact-form__success-heading">Thank You</h2>
              <p className="contact-form__success-text">Your message has been received. We&rsquo;ll be in touch shortly.</p>
            </div>
          ) : (
            <Form
              method="post"
              className="contact-form"
              noValidate
              onSubmit={handleSubmit}
            >
              {serverErrors.form && (
                <p className="contact-form__error-banner">{serverErrors.form}</p>
              )}

              <input type="hidden" name="formToken" value={formTokenValue} />

              {/* Name + Phone row */}
              <div className="contact-form__row">
                <div className="contact-form__field">
                  <label className="contact-form__label" htmlFor="cf-name">
                    Name <span className="contact-form__required" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="cf-name"
                    name="name"
                    type="text"
                    maxLength={200}
                    autoComplete="name"
                    className={`contact-form__input${serverErrors.name ? " is-error" : ""}`}
                  />
                  {serverErrors.name && (
                    <span className="contact-form__field-error" role="alert">{serverErrors.name}</span>
                  )}
                </div>

                <div className="contact-form__field">
                  <label className="contact-form__label" htmlFor="cf-phone">
                    Phone <span className="contact-form__required" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="cf-phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="numeric"
                    placeholder="(555) 555-5555"
                    value={phoneValue}
                    onChange={(e) => setPhoneValue(formatPhone(e.target.value))}
                    className={`contact-form__input${serverErrors.phone ? " is-error" : ""}`}
                  />
                  {/* Submit the raw digits so server validation is straightforward */}
                  <input type="hidden" name="phone" value={phoneValue.replace(/\D/g, "")} />
                  {serverErrors.phone && (
                    <span className="contact-form__field-error" role="alert">{serverErrors.phone}</span>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="contact-form__field">
                <label className="contact-form__label" htmlFor="cf-email">
                  Email <span className="contact-form__required" aria-hidden="true">*</span>
                </label>
                <input
                  id="cf-email"
                  name="email"
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  className={`contact-form__input${serverErrors.email ? " is-error" : ""}`}
                />
                {serverErrors.email && (
                  <span className="contact-form__field-error" role="alert">{serverErrors.email}</span>
                )}
              </div>

              {/* Topic */}
              <div className="contact-form__field">
                <label className="contact-form__label" htmlFor="cf-topic">
                  Topic <span className="contact-form__required" aria-hidden="true">*</span>
                </label>
                <select
                  id="cf-topic"
                  name="topic"
                  defaultValue=""
                  className={`contact-form__select${serverErrors.topic ? " is-error" : ""}`}
                >
                  <option value="" disabled>Select a Topic</option>
                  {topics.map((t) => (
                    <option key={t.label} value={t.label}>{t.label}</option>
                  ))}
                </select>
                {serverErrors.topic && (
                  <span className="contact-form__field-error" role="alert">{serverErrors.topic}</span>
                )}
              </div>

              {/* Message */}
              <div className="contact-form__field">
                <label className="contact-form__label" htmlFor="cf-message">Message</label>
                <textarea
                  id="cf-message"
                  name="message"
                  className="contact-form__textarea"
                  rows={5}
                  maxLength={5000}
                />
              </div>

              <div className="contact-form__footer">
                <p className="contact-form__legend">
                  <span className="contact-form__legend-star">*</span>
                  required fields
                </p>
                <button
                  type="submit"
                  className="btn btn--outline contact-form__submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending…" : "Send Message"}
                </button>
              </div>
            </Form>
          )}
        </div>

      </div>{/* contact-page__body */}
    </section>
  );
}
