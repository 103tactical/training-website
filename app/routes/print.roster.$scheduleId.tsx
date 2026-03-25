import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/node";

const API = process.env.PAYLOAD_API_URL ?? "";
const PRINT_SECRET = process.env.PRINT_SECRET ?? "";

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data ? `${data.courseName} — ${data.schedule.label} Roster` : "Roster" },
];

export async function loader({ params, request }: LoaderFunctionArgs) {
  // Simple token guard — set PRINT_SECRET in env to enable
  if (PRINT_SECRET) {
    const token = new URL(request.url).searchParams.get("token");
    if (token !== PRINT_SECRET) {
      throw new Response("Unauthorized", { status: 401 });
    }
  }

  const id = params.scheduleId;

  const [scheduleRes, attendeesRes] = await Promise.all([
    fetch(`${API}/api/course-schedules/${id}?depth=2`),
    fetch(`${API}/api/attendees?where[courseSchedule][equals]=${id}&limit=500&depth=0`),
  ]);

  if (!scheduleRes.ok) throw new Response("Session not found", { status: 404 });

  const schedule = await scheduleRes.json();
  const attendeesData = await attendeesRes.json();
  const attendees: Attendee[] = attendeesData.docs ?? [];

  const course = schedule.course;
  const courseName: string =
    typeof course === "object" && course !== null ? (course.title ?? "") : "";

  const instructor = schedule.instructor;
  const instructorName: string =
    typeof instructor === "object" && instructor !== null ? (instructor.name ?? "") : "";

  const dates: string[] = (schedule.sessions ?? []).map((s: { date: string }) =>
    new Date(s.date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  );

  return json({ schedule, attendees, courseName, instructorName, dates });
}

interface Attendee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: string;
  paymentReference?: string;
  notes?: string;
}

export default function PrintRoster() {
  const { schedule, attendees, courseName, instructorName, dates } =
    useLoaderData<typeof loader>();

  const confirmed  = attendees.filter((a) => a.status === "confirmed");
  const waitlisted = attendees.filter((a) => a.status === "waitlisted");
  const cancelled  = attendees.filter((a) => a.status === "cancelled");
  const transferred = attendees.filter((a) => a.status === "transferred");

  const printed = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="print-page">

      {/* Print button — hidden when actually printing */}
      <div className="print-page__toolbar no-print">
        <button className="print-page__btn" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>

      {/* Header */}
      <header className="print-page__header">
        <h1 className="print-page__course">{courseName}</h1>
        <h2 className="print-page__session">
          {schedule.displayLabel ?? schedule.label}
        </h2>
        <dl className="print-page__meta">
          <div>
            <dt>Internal Label</dt>
            <dd>{schedule.label}</dd>
          </div>
          {instructorName && (
            <div>
              <dt>Instructor</dt>
              <dd>{instructorName}</dd>
            </div>
          )}
          {dates.length > 0 && (
            <div>
              <dt>Date{dates.length > 1 ? "s" : ""}</dt>
              <dd>{dates.join("  ·  ")}</dd>
            </div>
          )}
          <div>
            <dt>Capacity</dt>
            <dd>
              {schedule.seatsBooked ?? 0} booked / {schedule.maxSeats} total
            </dd>
          </div>
          <div>
            <dt>Printed</dt>
            <dd>{printed}</dd>
          </div>
        </dl>
      </header>

      <AttendeeTable title="Confirmed" attendees={confirmed} />
      {waitlisted.length  > 0 && <AttendeeTable title="Waitlisted"  attendees={waitlisted}  />}
      {transferred.length > 0 && <AttendeeTable title="Transferred" attendees={transferred} />}
      {cancelled.length   > 0 && <AttendeeTable title="Cancelled"   attendees={cancelled}   />}

      <footer className="print-page__footer">
        103 Tactical Training &nbsp;·&nbsp; 2556 Arthur Kill Road, Staten Island, NY 10309
      </footer>
    </div>
  );
}

function AttendeeTable({ title, attendees }: { title: string; attendees: Attendee[] }) {
  if (attendees.length === 0) return null;
  return (
    <section className="print-table">
      <h3 className="print-table__heading">
        {title} <span className="print-table__count">({attendees.length})</span>
      </h3>
      <table className="print-table__table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Ref #</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {attendees.map((a, i) => (
            <tr key={a.id}>
              <td>{i + 1}</td>
              <td>{a.firstName} {a.lastName}</td>
              <td>{a.email}</td>
              <td>{a.phone ?? "—"}</td>
              <td>{a.paymentReference ?? "—"}</td>
              <td>{a.notes ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
