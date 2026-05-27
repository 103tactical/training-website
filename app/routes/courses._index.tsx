import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { getCoursesPage, getAllCourses, resolveMediaUrl } from "~/lib/payload";
import type { CoursesPage, Course, CourseGroup } from "~/lib/payload";
import CourseCard from "~/components/CourseCard";
import { buildMeta, getRootSeoDefaults } from "~/lib/meta";

export const meta: MetaFunction<typeof loader> = ({ data, matches }) => {
  const { defaultOgImage, defaultSiteName } = getRootSeoDefaults(matches);
  const seo = data?.coursesPage?.seo;
  return buildMeta({
    pageTitle: seo?.title ?? "Courses",
    siteName: defaultSiteName ?? "103 Tactical",
    description: seo?.description ?? "Browse firearm safety, licensing, and tactical training courses offered by 103 Tactical on Staten Island, NY.",
    ogImage: seo?.ogImage?.url ? resolveMediaUrl(seo.ogImage.url) : defaultOgImage,
    canonicalUrl: data?.canonicalUrl,
  });
};

export async function loader({ request }: LoaderFunctionArgs) {
  const [coursesPage, allCourses] = await Promise.allSettled([
    getCoursesPage(),
    getAllCourses(),
  ]);
  return json({
    coursesPage: coursesPage.status === "fulfilled" ? coursesPage.value : null,
    allCourses: allCourses.status === "fulfilled" ? allCourses.value.docs : [],
    canonicalUrl: new URL(request.url).toString(),
  });
}

export default function CoursesRoute() {
  const { coursesPage, allCourses } = useLoaderData<typeof loader>();
  const heroImageUrl = resolveMediaUrl(coursesPage?.heroImage?.url);

  // Featured course — resolve its button link based on linkType
  const featured = coursesPage?.featuredCourse;
  const featuredImageUrl = resolveMediaUrl(featured?.image?.url);
  const featuredCourse =
    featured?.course && typeof featured.course === "object" ? featured.course : null;
  let featuredHref: string | null = null;
  if (featured?.linkType === "custom" && featured.customUrl) {
    featuredHref = featured.customUrl;
  } else if (featured?.linkType === "detail" && featuredCourse?.slug) {
    featuredHref = `/courses/${featuredCourse.slug}`;
  } else if (featured?.linkType === "schedule" && featuredCourse?.slug) {
    featuredHref = `/courses/${featuredCourse.slug}/schedule`;
  }
  const featuredHrefIsExternal = !!featuredHref && /^https?:\/\//i.test(featuredHref);
  const showFeatured =
    featured?.enabled &&
    (featured.heading || featured.body || featured.image?.url);

  const selectedGroups: CourseGroup[] = (coursesPage?.courseGroups ?? [])
    .map((cg) => (typeof cg.group === "object" ? cg.group : null))
    .filter((g): g is CourseGroup => g !== null);

  // Collect IDs already shown in groups so we don't duplicate below
  const groupCourseIds = new Set(
    selectedGroups.flatMap((g) => (g.courses ?? []).map((c) => c.course?.id))
  );

  const remainingCourses = allCourses.filter(
    (c) => c.isActive && !groupCourseIds.has(c.id)
  );

  return (
    <>
      {/* Hero */}
      <div className="contact-page__hero courses-page__hero">
        {heroImageUrl && (
          <img
            className="contact-page__hero-img"
            src={heroImageUrl}
            alt={coursesPage?.heroImage?.alt ?? "Courses"}
          />
        )}
        {(coursesPage?.header?.title || coursesPage?.header?.subtext) && (
          <div className="contact-page__hero-content courses-page__hero-content">
            {coursesPage?.header?.title && (
              <h1 className="contact-page__title">{coursesPage.header.title}</h1>
            )}
            {coursesPage?.header?.subtext && (
              <p className="contact-page__subtitle">{coursesPage.header.subtext}</p>
            )}
          </div>
        )}
      </div>

      {/* Featured Course promo */}
      {showFeatured && (
        <section className="featured-course">
          <div className="container">
            <div className="featured-course__box">
              {featured?.eyebrow && (
                <p className="featured-course__eyebrow">{featured.eyebrow}</p>
              )}
              <div className="featured-course__inner">

                {/* Image */}
                <div className="featured-course__img-wrap">
                  {featured?.badge && (
                    <span className="product-badge">{featured.badge}</span>
                  )}
                  {featuredImageUrl ? (
                    <img
                      className="featured-course__img"
                      src={featuredImageUrl}
                      alt={featured?.image?.alt ?? featured?.heading ?? "Featured course"}
                    />
                  ) : (
                    <div className="featured-course__img featured-course__img--placeholder" />
                  )}
                </div>

                {/* Details */}
                <div className="featured-course__details">
                  {featured?.heading && (
                    <h2 className="featured-course__heading">{featured.heading}</h2>
                  )}
                  {featured?.body && (
                    <p className="featured-course__body">{featured.body}</p>
                  )}
                  {featuredHref && (
                    <div className="featured-course__cta-wrap">
                      {featuredHrefIsExternal ? (
                        <a
                          href={featuredHref}
                          className="btn btn--outline featured-course__cta-btn"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {featured?.buttonLabel ?? "Book Now"}
                        </a>
                      ) : (
                        <Link
                          to={featuredHref}
                          className="btn btn--outline featured-course__cta-btn"
                        >
                          {featured?.buttonLabel ?? "Book Now"}
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Selected course groups */}
      {selectedGroups.map((group) => {
        const activeCourses = (group.courses ?? []).filter((c) => c.course?.isActive);
        if (activeCourses.length === 0) return null;
        return (
          <section key={group.id} className="courses-section">
            <div className="courses-section__header">
              <h2 className="courses-section__heading">{group.title}</h2>
            </div>
            <div className="container">
              <div className="courses-section__grid">
                {activeCourses.map(({ id, course }) => (
                  <CourseCard key={id} course={course} />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* All remaining courses */}
      {remainingCourses.length > 0 && (
        <section className="courses-section">
          <div className="courses-section__header">
            <h2 className="courses-section__heading">Additional Training</h2>
          </div>
          <div className="container">
            <div className="courses-section__grid">
              {remainingCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
