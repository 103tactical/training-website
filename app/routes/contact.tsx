import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { useState } from "react";
import { getContactSettings, getSiteSettings, PAYLOAD_API_URL } from "~/lib/payload";
import { PhoneIcon, EmailIcon, LocationIcon } from "~/components/Icons";

export const meta: MetaFunction = () => [
  { title: "Contact | 103 Tactical Training" },
];

/* ── Loader — fetch topics from CMS ─────────────────────────────────────── */

export async function loader(_: LoaderFunctionArgs) {
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
  });
}

/* ── Action — validate + submit to Payload ──────────────────────────────── */

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const name    = (formData.get("name")    as string | null)?.trim() ?? "";
  const email   = (formData.get("email")   as string | null)?.trim() ?? "";
  const phone   = (formData.get("phone")   as string | null)?.trim() ?? "";
  const topic   = (formData.get("topic")   as string | null)?.trim() ?? "";
  const message = (formData.get("message") as string | null)?.trim() ?? "";

  const errors: Record<string, string> = {};
  if (!name)                                          errors.name  = "Name is required.";
  if (!email)                                         errors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Please enter a valid email address.";
  if (!phone)                                         errors.phone = "Phone number is required.";
  if (!topic)                                         errors.topic = "Please select a topic.";

  if (Object.keys(errors).length > 0) {
    return json({ success: false, errors }, { status: 400 });
  }

  try {
    const res = await fetch(`${PAYLOAD_API_URL}/api/contact-submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, topic, message }),
    });
    if (!res.ok) throw new Error(`Payload responded with ${res.status}`);
    return json({ success: true, errors: {} });
  } catch (err) {
    console.error("Contact form submission error:", err);
    return json(
      { success: false, errors: { form: "Something went wrong. Please try again." } },
      { status: 500 }
    );
  }
}

/* ── Component ───────────────────────────────────────────────────────────── */

export default function Contact() {
  const { topics, heroImageUrl, heroImageAlt, phone, email, address, city } =
    useLoaderData<typeof loader>();
  const actionData   = useActionData<typeof action>();
  const navigation   = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Track which fields have been interacted with so we only show
  // errors after the user has touched a field or attempted submit.
  const [attempted, setAttempted] = useState(false);

  const serverErrors = actionData?.errors ?? {};
  const success      = actionData?.success === true;

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
        <div className="contact-form-wrap">
          {success ? (
            <div className="contact-form__success">
              <p>Thank you — your message has been received. We&rsquo;ll be in touch shortly.</p>
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
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    className={`contact-form__input${serverErrors.phone ? " is-error" : ""}`}
                  />
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
