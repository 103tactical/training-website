import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => [
  { title: "Contact | 103 Tactical Training" },
];

export default function Contact() {
  return (
    <section className="placeholder-page">
      <h1>Contact</h1>
    </section>
  );
}
