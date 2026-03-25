import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { getHomePage, getUtility, resolveMediaUrl } from "~/lib/payload";
import type { HomePage, CourseGroup, TestimonialItem } from "~/lib/payload";
import { BulletIcon, cmsIcons } from "~/components/Icons";
import type { CmsIconKey } from "~/components/Icons";
import FeaturedCarousel from "~/components/FeaturedCarousel";
import CourseCard from "~/components/CourseCard";
import HighlightCallouts from "~/components/HighlightCallouts";

export const meta: MetaFunction = () => [
  { title: "103 Tactical Training" },
];

export async function loader(_: LoaderFunctionArgs) {
  try {
    const [homePage, utility] = await Promise.allSettled([
      getHomePage(),
      getUtility(),
    ]);
    return json({
      homePage: homePage.status === "fulfilled" ? homePage.value : null,
      carouselDelay: utility.status === "fulfilled" ? (utility.value.carouselDelay ?? "6") : "6",
    });
  } catch {
    return json({ homePage: null, carouselDelay: "6" as const });
  }
}

export default function Index() {
  const { homePage, carouselDelay } = useLoaderData<typeof loader>();
  const courseGroup = homePage?.featuredCoursesSection?.courseGroup;
  const populatedGroup = courseGroup && typeof courseGroup === "object" ? courseGroup as CourseGroup : null;

  return (
    <>
      <div className="site-headline-spacer">
        {homePage?.websiteHeadlineSection?.headline && (
          <div className="site-headline">
            <h1 className="site-headline__text">{homePage.websiteHeadlineSection.headline}</h1>
          </div>
        )}
      </div>
      {homePage?.featured && homePage.featured.length > 0 && (
        <FeaturedCarousel slides={homePage.featured} delay={carouselDelay} />
      )}
      {populatedGroup && populatedGroup.courses && populatedGroup.courses.length > 0 && (
        <CoursesSection courseGroup={populatedGroup} />
      )}
      {homePage?.highlightCallouts?.items && homePage.highlightCallouts.items.length > 0 && (
        <HighlightCallouts
          items={homePage.highlightCallouts.items}
          oddItemPlacement={homePage.highlightCallouts.oddItemPlacement ?? "first"}
        />
      )}
      {homePage?.testimonialsSection?.items && homePage.testimonialsSection.items.length > 0 && (
        <TestimonialsSection data={homePage.testimonialsSection} />
      )}
      {homePage?.badgesSection?.badges && homePage.badgesSection.badges.length > 0 && (
        <BadgesSection data={homePage.badgesSection} />
      )}
      {homePage?.whyChoose && (
        <WhyChooseSection data={homePage.whyChoose} />
      )}
    </>
  );
}

function CoursesSection({ courseGroup }: { courseGroup: CourseGroup }) {
  const activeCourses = (courseGroup.courses ?? []).filter((c) => c.course?.isActive);
  if (activeCourses.length === 0) return null;

  return (
    <section className="courses-section">
      <div className="courses-section__header">
        <h2 className="courses-section__heading">{courseGroup.title}</h2>
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
}

function BadgesSection({ data }: { data: NonNullable<HomePage["badgesSection"]> }) {
  return (
    <section className="badges-section">
      <div className="container">
        {data.heading && (
          <h2 className="badges-section__heading">{data.heading}</h2>
        )}
        <div className="badges-section__row">
          {data.badges.map((badge) => {
            const imgUrl = resolveMediaUrl(badge.image?.url);
            return (
              <a
                key={badge.id}
                href={badge.url}
                className="badges-section__item"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={badge.name}
              >
                {imgUrl && (
                  <img
                    src={imgUrl}
                    alt={badge.image?.alt ?? badge.name}
                    className="badges-section__img"
                  />
                )}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection({ data }: { data: NonNullable<HomePage["testimonialsSection"]> }) {
  const items = data.items ?? [];
  if (items.length === 0) return null;

  const outerRef = useRef<HTMLDivElement>(null);
  const [activeDot, setActiveDot] = useState(0);
  const [slidesPerView, setSlidesPerView] = useState(1);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w >= 1280) setSlidesPerView(4);
      else if (w >= 1024) setSlidesPerView(3);
      else if (w >= 768) setSlidesPerView(2);
      else setSlidesPerView(1);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const totalDots = Math.ceil(items.length / slidesPerView);

  const goToDot = useCallback((dot: number) => {
    if (!outerRef.current) return;
    outerRef.current.scrollTo({
      left: dot * outerRef.current.clientWidth,
      behavior: "smooth",
    });
    setActiveDot(dot);
  }, []);

  const handleScroll = useCallback(() => {
    if (!outerRef.current) return;
    const { scrollLeft, clientWidth } = outerRef.current;
    if (clientWidth === 0) return;
    const dot = Math.round(scrollLeft / clientWidth);
    setActiveDot(Math.min(dot, totalDots - 1));
  }, [totalDots]);

  return (
    <section className="testimonials-section">
      {data.heading && (
        <div className="container">
          <h2 className="testimonials-section__heading">{data.heading}</h2>
        </div>
      )}
      <div
        className="testimonials-section__outer"
        ref={outerRef}
        onScroll={handleScroll}
      >
        <div className="testimonials-section__track">
          {items.map((item: TestimonialItem, i: number) => (
            <div key={item.id ?? i} className="testimonial-card">
              <span className="testimonial-card__quote-mark" aria-hidden="true">&ldquo;</span>
              <p className="testimonial-card__quote">{item.quote}</p>
              <div className="testimonial-card__footer">
                <span className="testimonial-card__name">{item.name}</span>
                {item.context && (
                  <span className="testimonial-card__context">{item.context}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {totalDots > 1 && (
        <div className="testimonials-section__dots">
          {Array.from({ length: totalDots }).map((_, i) => (
            <button
              key={i}
              className={`testimonials-section__dot${i === activeDot ? " testimonials-section__dot--active" : ""}`}
              onClick={() => goToDot(i)}
              aria-label={`Go to slide group ${i + 1}`}
            />
          ))}
        </div>
      )}
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
