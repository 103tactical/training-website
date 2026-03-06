import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getHomePage, getUtility, getCourseGroups } from "~/lib/payload";
import type { HomePage, CourseGroups } from "~/lib/payload";
import { BulletIcon, cmsIcons } from "~/components/Icons";
import type { CmsIconKey } from "~/components/Icons";
import FeaturedCarousel from "~/components/FeaturedCarousel";
import CourseCard from "~/components/CourseCard";

export const meta: MetaFunction = () => [
  { title: "103 Tactical Training" },
];

export async function loader(_: LoaderFunctionArgs) {
  try {
    const [homePage, utility, courseGroups] = await Promise.allSettled([
      getHomePage(),
      getUtility(),
      getCourseGroups(),
    ]);
    return json({
      homePage: homePage.status === "fulfilled" ? homePage.value : null,
      carouselDelay: utility.status === "fulfilled" ? (utility.value.carouselDelay ?? "6") : "6",
      courseGroups: courseGroups.status === "fulfilled" ? courseGroups.value : null,
    });
  } catch {
    return json({ homePage: null, carouselDelay: "6" as const, courseGroups: null });
  }
}

export default function Index() {
  const { homePage, carouselDelay, courseGroups } = useLoaderData<typeof loader>();

  return (
    <>
      {homePage?.websiteHeadline && (
        <div className="site-headline">
          <h1 className="site-headline__text">{homePage.websiteHeadline}</h1>
        </div>
      )}
      {homePage?.featured && homePage.featured.length > 0 && (
        <FeaturedCarousel slides={homePage.featured} delay={carouselDelay} />
      )}
      {courseGroups && courseGroups.groups && courseGroups.groups.length > 0 && (
        <CoursesSection
          heading={homePage?.featuredCoursesSection?.heading}
          courseGroups={courseGroups}
        />
      )}
      {homePage?.whyChoose && (
        <WhyChooseSection data={homePage.whyChoose} />
      )}
    </>
  );
}

function CoursesSection({
  heading,
  courseGroups,
}: {
  heading?: string;
  courseGroups: CourseGroups;
}) {
  return (
    <section className="courses-section">
      {heading && (
        <div className="courses-section__header">
          <h2 className="courses-section__heading">{heading}</h2>
        </div>
      )}
      <div className="container">
        {courseGroups.groups!.map((group) => {
          const activeCourses = (group.courses ?? []).filter((c) => c.course?.isActive);
          if (activeCourses.length === 0) return null;
          return (
            <div key={group.id} className="courses-section__group">
              {group.title && (
                <h3 className="courses-section__group-heading">{group.title}</h3>
              )}
              <div className="courses-section__grid">
                {activeCourses.map(({ id, course }) => (
                  <CourseCard key={id} course={course} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function WhyChooseSection({ data }: { data: HomePage["whyChoose"] }) {
  const { heading, items } = data;
  if (!items || items.length === 0) return null;

  return (
    <section className="details-section">
      <div className="details-section__header">
        <h2 className="details-section__heading">{heading}</h2>
      </div>

      <div className="container">
        <div className="details-section__grid">
          {items.map((item, i) => (
            <div key={i} className="details-section__item">
              <div className="details-section__item-title-row">
                {item.icon && (() => {
                  const Icon = cmsIcons[item.icon as CmsIconKey];
                  return Icon ? <Icon className="icon details-section__item-icon" /> : null;
                })()}
                <h3 className="details-section__item-title">{item.title}</h3>
              </div>

              {item.description && (
                <p className="details-section__item-desc">{item.description}</p>
              )}

              {item.bullets && item.bullets.length > 0 && (
                <ul className="details-section__bullets">
                  {item.bullets.map((b, j) => (
                    <li key={j} className="details-section__bullet">
                      <BulletIcon className="details-section__bullet-icon" />
                      {b.item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
