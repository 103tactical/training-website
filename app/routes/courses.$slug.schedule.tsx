import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { useLoaderData, Link, useNavigate } from "@remix-run/react";
import { useEffect } from "react";
import { getCourseBySlug, getCourseSchedules, resolveMediaUrl } from "~/lib/payload";
import type { Course, CourseSchedule, Instructor } from "~/lib/payload";
import MiniCalendar from "~/components/MiniCalendar";
import { buildMeta, getRootSeoDefaults } from "~/lib/meta";
import { trackScheduleView, trackScheduleNowClick } from "~/lib/analytics";

export const meta: MetaFunction<typeof loader> = ({ data, matches }) => {
  const { defaultOgImage, defaultSiteName } = getRootSeoDefaults(matches);
  const course = data?.course;
  if (!course) return [{ title: `Schedule | ${defaultSiteName ?? "103 Tactical"}` }];
  const ogImageUrl =
    resolveMediaUrl(course.socialShareImage?.url) ??
    resolveMediaUrl(course.thumbnail?.url) ??
    defaultOgImage;
  return buildMeta({
    pageTitle: `${course.title} — Available Sessions`,
    siteName: defaultSiteName ?? "103 Tactical",
    ogImage: ogImageUrl,
    canonicalUrl: data?.canonicalUrl,
  });
};

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

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { slug } = params;
  if (!slug) throw new Response("Not found", { status: 404 });

  const result = await getCourseBySlug(slug);
  if (!result?.docs?.length) throw new Response("Course not found", { status: 404 });

  const course = result.docs[0] as Course;
  const schedulesResult = await getCourseSchedules(course.id);
  const schedules = schedulesResult?.docs ?? [];

  return json({ course, schedules, canonicalUrl: new URL(request.url).toString() });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CourseSchedulePage() {
  const { course, schedules } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const imageUrl = resolveMediaUrl(course.thumbnail?.url);
  const activeSchedules = schedules as CourseSchedule[];

  useEffect(() => {
    trackScheduleView(course.title, course.slug);
  }, [course.slug, course.title]);

  return (
    <div className="schedule-page">
      <div className="container schedule-page__inner">

        {/* ── Left column: course card ── */}
        <div className="schedule-page__course-card">
          {imageUrl && (
            <div className="schedule-page__img-wrap">
              <img
                className="schedule-page__img"
                src={imageUrl}
                alt={course.thumbnail?.alt ?? course.title}
              />
              <div className="schedule-page__img-tint" />
              <div className="schedule-page__img-overlay">
                <h1 className="schedule-page__title">{course.title}</h1>
                <div className="schedule-page__meta">
                  {course.durationHours != null && (
                    <span className="schedule-page__meta-item">
                      {course.durationHours} {course.durationHours === 1 ? "Hour" : "Hours"}
                    </span>
                  )}
                  {course.durationDays != null && (
                    <span className="schedule-page__meta-item">
                      {course.durationDays} {course.durationDays === 1 ? "Day" : "Days"}
                    </span>
                  )}
                  {course.price != null && (
                    <span className="schedule-page__meta-price">
                      ${course.price.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <Link to={`/courses/${course.slug}`} className="schedule-page__back-link">
            ← Back to Course
          </Link>
        </div>

        {/* ── Right column: slots ── */}
        <div className="schedule-page__slots-col">
          <h2 className="schedule-page__heading">Available Sessions</h2>

          {activeSchedules.length === 0 ? (
            <p className="schedule-page__empty">
              No sessions are currently available. Check back soon.
            </p>
          ) : (
            <div className="schedule-page__slots">
              {activeSchedules.map((slot) => {
                const sessions = slot.sessions ?? [];
                const multiDay = sessions.length > 1;
                const { label: seatLabel, full } = seatsStatus(slot.maxSeats, slot.seatsBooked);

                return (
                  <div key={slot.id} className={`schedule-slot${full ? " schedule-slot--full" : ""}`}>
                    {(slot.displayLabel || slot.label) && (
                      <p className="schedule-slot__label">
                        {slot.displayLabel ?? slot.label}
                      </p>
                    )}
                    <MiniCalendar dates={sessions.map((s) => s.date)} />

                    {slot.instructor && typeof slot.instructor === "object" && (
                      <p className="schedule-slot__instructor">
                        <span className="schedule-slot__instructor-label">Instructor:</span>
                        {(slot.instructor as Instructor).name}
                      </p>
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
                      onClick={() => {
                        if (!full) {
                          trackScheduleNowClick(course.title, course.slug, "schedule_page");
                          navigate(`/book/${slot.id}`);
                        }
                      }}
                    >
                      {full ? "Unavailable" : "Schedule Now"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
