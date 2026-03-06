import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { getCourseBySlug, getCourseSchedules, resolveMediaUrl } from "~/lib/payload";
import type { Course, CourseSchedule } from "~/lib/payload";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function seatsStatus(maxSeats: number, seatsBooked = 0): { label: string; full: boolean } {
  const remaining = maxSeats - seatsBooked;
  if (remaining <= 0) return { label: "Full", full: true };
  if (remaining === 1) return { label: "1 seat remaining", full: false };
  return { label: `${remaining} seats remaining`, full: false };
}

// ── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ params }: LoaderFunctionArgs) {
  const { slug } = params;
  if (!slug) throw new Response("Not found", { status: 404 });

  const result = await getCourseBySlug(slug);
  if (!result?.docs?.length) throw new Response("Course not found", { status: 404 });

  const course = result.docs[0] as Course;
  const schedulesResult = await getCourseSchedules(course.id);
  const schedules = schedulesResult?.docs ?? [];

  return json({ course, schedules });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CourseSchedulePage() {
  const { course, schedules } = useLoaderData<typeof loader>();
  const imageUrl = resolveMediaUrl(course.thumbnail?.url);
  const activeSchedules = schedules as CourseSchedule[];

  return (
    <div className="schedule-page">

      {/* ── Course hero ── */}
      <div className="schedule-page__hero">
        {imageUrl && (
          <img
            className="schedule-page__hero-img"
            src={imageUrl}
            alt={course.thumbnail?.alt ?? course.title}
          />
        )}
        <div className="schedule-page__hero-tint" />
        <div className="container schedule-page__hero-content">
          <h1 className="schedule-page__title">{course.title}</h1>
          <div className="schedule-page__meta">
            {course.durationHours != null && (
              <span className="schedule-page__meta-item">{course.durationHours} Hours</span>
            )}
            {course.durationDays != null && (
              <span className="schedule-page__meta-item">
                {course.durationDays} {course.durationDays === 1 ? "Day" : "Days"}
              </span>
            )}
            {course.price != null && (
              <span className="schedule-page__meta-price">${course.price.toLocaleString()}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Slots ── */}
      <div className="container schedule-page__body">
        <div className="schedule-page__header">
          <h2 className="schedule-page__heading">Available Dates</h2>
          <Link to={`/courses/${course.slug}`} className="schedule-page__back-link">
            ← Back to Course
          </Link>
        </div>

        {activeSchedules.length === 0 ? (
          <p className="schedule-page__empty">
            No upcoming dates are currently available. Check back soon.
          </p>
        ) : (
          <div className="schedule-page__slots">
            {activeSchedules.map((slot) => {
              const sessions = slot.sessions ?? [];
              const multiDay = sessions.length > 1;
              const { label: seatLabel, full } = seatsStatus(slot.maxSeats, slot.seatsBooked);

              return (
                <div key={slot.id} className={`schedule-slot${full ? " schedule-slot--full" : ""}`}>
                  {slot.label && (
                    <p className="schedule-slot__label">{slot.label}</p>
                  )}

                  <div className="schedule-slot__sessions">
                    {sessions.map((session, idx) => (
                      <div key={session.id ?? idx} className="schedule-slot__session">
                        {multiDay && (
                          <span className="schedule-slot__day-badge">Day {idx + 1}</span>
                        )}
                        <span className="schedule-slot__date">{formatDate(session.date)}</span>
                        {(session.startTime || session.endTime) && (
                          <span className="schedule-slot__time">
                            {session.startTime && formatTime(session.startTime)}
                            {session.startTime && session.endTime && " – "}
                            {session.endTime && formatTime(session.endTime)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <p className={`schedule-slot__seats${full ? " schedule-slot__seats--full" : ""}`}>
                    {seatLabel}
                  </p>

                  <button
                    type="button"
                    className="btn btn--outline btn--lg schedule-slot__cta"
                    disabled={full}
                    aria-disabled={full}
                  >
                    {full ? "Unavailable" : "Book This Slot"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
