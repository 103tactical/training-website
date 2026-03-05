import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => [
  { title: "Courses | 103 Tactical Training" },
];

export default function Courses() {
  return (
    <section className="placeholder-page">
      <h1>Courses</h1>
    </section>
  );
}
