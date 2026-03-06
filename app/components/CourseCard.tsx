import { useState } from "react";
import { Link } from "@remix-run/react";
import type { Course } from "~/lib/payload";
import { resolveMediaUrl } from "~/lib/payload";
import { BulletIcon, FlipIcon } from "~/components/Icons";

interface CourseCardProps {
  course: Course;
}

export default function CourseCard({ course }: CourseCardProps) {
  const [flipped, setFlipped] = useState(false);
  const imageUrl = resolveMediaUrl(course.thumbnail?.url);
  const hasSummary = course.summary && course.summary.length > 0;

  return (
    <div className="course-card">
      {/* Image / Summary toggle area */}
      <div
        className="course-card__media"
        onClick={() => hasSummary && setFlipped((f) => !f)}
        role={hasSummary ? "button" : undefined}
        aria-label={hasSummary ? (flipped ? "Show image" : "Show course summary") : undefined}
        tabIndex={hasSummary ? 0 : undefined}
        onKeyDown={(e) => {
          if (hasSummary && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setFlipped((f) => !f);
          }
        }}
      >
        <div className={`course-card__media-inner${flipped ? " course-card__media-inner--flipped" : ""}`}>
          <div className="course-card__face course-card__face--front">
            {imageUrl && (
              <img
                className="course-card__image"
                src={imageUrl}
                alt={course.thumbnail?.alt ?? course.title}
              />
            )}
            {hasSummary && (
              <FlipIcon className="course-card__flip-icon" aria-hidden="true" />
            )}
          </div>

          {hasSummary && (
            <div className="course-card__face course-card__face--back" aria-hidden={!flipped}>
              <h4 className="course-card__summary-heading">Course Summary</h4>
              <ul className="course-card__bullets">
                {course.summary!.map((b, i) => (
                  <li key={i} className="course-card__bullet">
                    <BulletIcon className="course-card__bullet-icon" />
                    <span>{b.item}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={`/courses/${course.slug}`}
                className="btn btn--outline btn--lg course-card__details-btn"
                onClick={(e) => e.stopPropagation()}
              >
                View Details
              </Link>
              <FlipIcon className="course-card__flip-icon" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="course-card__body">
        <Link to={`/courses/${course.slug}`} className="course-card__title-link">
          <h3 className="course-card__title">{course.title}</h3>
        </Link>

        <div className="course-card__meta">
          {course.durationHours != null && (
            <p className="course-card__meta-item">{course.durationHours} Hours</p>
          )}
          {course.durationDays != null && (
            <p className="course-card__meta-item">{course.durationDays} {course.durationDays === 1 ? "Day" : "Days"}</p>
          )}
        </div>

        {course.price != null && (
          <p className="course-card__price">${course.price.toLocaleString()}</p>
        )}

        <div className="course-card__card-actions">
          <button type="button" className="btn btn--outline btn--lg course-card__signup-btn">
            Schedule Now
          </button>
          <Link
            to={`/courses/${course.slug}`}
            className="btn btn--outline btn--lg course-card__details-btn"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}
