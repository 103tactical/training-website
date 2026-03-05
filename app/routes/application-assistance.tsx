import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => [
  { title: "Applications | 103 Tactical Training" },
];

export default function ApplicationAssistance() {
  return (
    <section className="placeholder-page">
      <h1>Applications</h1>
    </section>
  );
}
