import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { getCourseBySlug, resolveMediaUrl } from "~/lib/payload";
import type { Course } from "~/lib/payload";
import RichText from "~/components/RichText";
import { BulletIcon } from "~/components/Icons";
import { buildMeta } from "~/lib/meta";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const course = data?.course;
  if (!course) return [{ title: "Course | 103 Tactical Training" }];

  // Prefer dedicated social share image, fall back to card thumbnail
  const ogImageUrl =
    resolveMediaUrl(course.socialShareImage?.url) ??
    resolveMediaUrl(course.thumbnail?.url);

  const tags = buildMeta({
    pageTitle: course.title,
    ogImage: ogImageUrl,
    canonicalUrl: data?.canonicalUrl,
    ogType: "article",
  });

  // JSON-LD Course structured data
  tags.push({
    "script:ld+json": {
      "@context": "https://schema.org",
      "@type": "Course",
      name: course.title,
      url: data?.canonicalUrl,
      ...(course.price != null && {
        offers: {
          "@type": "Offer",
          price: course.price,
          priceCurrency: "USD",
        },
      }),
    },
  });

  return tags;
};

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { slug } = params;
  if (!slug) throw new Response("Not found", { status: 404 });

  const result = await getCourseBySlug(slug);
  if (!result?.docs?.length) {
    throw new Response("Course not found", { status: 404 });
  }

  return json({
    course: result.docs[0] as Course,
    canonicalUrl: new URL(request.url).toString(),
  });
}

export default function CourseDetailRoute() {
  const { course } = useLoaderData<typeof loader>();
  const imageUrl = resolveMediaUrl(course.thumbnail?.url);
  const hasMeta = course.durationHours != null || course.durationDays != null;

  return (
    <div className="course-detail">
      <div className="container course-detail__inner">

        {/* ── Content column ── */}
        <div className="course-detail__content">

          <h1 className="course-detail__title">{course.title}</h1>

          {/* Duration */}
          {hasMeta && (
            <div className="course-detail__info-box">
              <dl className="course-detail__meta-grid">
                {course.durationHours != null && (
                  <>
                    <dt className="course-detail__meta-label">Duration:</dt>
                    <dd className="course-detail__meta-value">{course.durationHours} Hours</dd>
                  </>
                )}
                {course.durationDays != null && (
                  <>
                    <dt className="course-detail__meta-label">Sessions:</dt>
                    <dd className="course-detail__meta-value">
                      {course.durationDays} {course.durationDays === 1 ? "Day" : "Days"}
                    </dd>
                  </>
                )}
              </dl>
            </div>
          )}

          {/* Rich-text description */}
          {course.description && (
            <div className="course-detail__description-box">
              <RichText content={course.description} />
            </div>
          )}

          {/* Bullet summary */}
          {course.summary && course.summary.length > 0 && (
            <div className="course-detail__summary-box">
              <h3 className="course-detail__summary-heading">Course Summary</h3>
              <ul className="course-detail__bullets">
                {course.summary.map((b, i) => (
                  <li key={i} className="course-detail__bullet">
                    <BulletIcon className="course-detail__bullet-icon" />
                    <span>{b.item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {course.price != null && (
            <p className="course-detail__price">${course.price.toLocaleString()}</p>
          )}

          <div className="course-detail__actions">
            <Link
              to={`/courses/${course.slug}/schedule`}
              className="btn btn--outline btn--lg"
            >
              View Available Sessions
            </Link>
            <Link to="/courses" className="course-detail__back-link">
              ← Back to Courses
            </Link>
          </div>
        </div>

        {/* ── Image column ── */}
        {imageUrl && (
          <div className="course-detail__img-wrap">
            <img
              className="course-detail__img"
              src={imageUrl}
              alt={course.thumbnail?.alt ?? course.title}
            />
          </div>
        )}

      </div>
    </div>
  );
}
