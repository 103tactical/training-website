import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { useState } from "react";
import { getContactSettings, PAYLOAD_API_URL } from "~/lib/payload";

export const meta: MetaFunction = () => [
  { title: "Contact | 103 Tactical Training" },
];

/* ── Loader — fetch topics from CMS ─────────────────────────────────────── */

export async function loader(_: LoaderFunctionArgs) {
  try {
    const settings = await getContactSettings();
    return json({ topics: settings.topics ?? [] });
  } catch {
    return json({ topics: [] });
  }
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
  const { topics }   = useLoaderData<typeof loader>();
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
      <div className="contact-page__header">
        <h1 className="contact-page__title">Contact Us</h1>
        <p className="contact-page__subtitle">We&rsquo;re here to help.</p>
      </div>

      <div className="container">
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
                <button
                  type="submit"
                  className="btn btn--dark-red contact-form__submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending…" : "Send Message"}
                </button>
              </div>
            </Form>
          )}
        </div>
      </div>
    </section>
  );
}
