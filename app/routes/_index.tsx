import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getHomePage } from "~/lib/payload";
import type { HomePage } from "~/lib/payload";
import { BulletIcon } from "~/components/Icons";
import FeaturedCarousel from "~/components/FeaturedCarousel";

export const meta: MetaFunction = () => [
  { title: "103 Tactical Training" },
];

export async function loader(_: LoaderFunctionArgs) {
  try {
    const homePage = await getHomePage();
    return json({ homePage });
  } catch {
    return json({ homePage: null });
  }
}

export default function Index() {
  const { homePage } = useLoaderData<typeof loader>();

  return (
    <>
      {homePage?.websiteHeadline && (
        <div className="site-headline">
          <h1 className="site-headline__text">{homePage.websiteHeadline}</h1>
        </div>
      )}
      {homePage?.featured && homePage.featured.length > 0 && (
        <FeaturedCarousel slides={homePage.featured} />
      )}
      {homePage?.whyChoose && (
        <WhyChooseSection data={homePage.whyChoose} />
      )}
    </>
  );
}

function WhyChooseSection({ data }: { data: HomePage["whyChoose"] }) {
  const { heading, items } = data;
  if (!items || items.length === 0) return null;

  return (
    <section className="why-choose">
      <div className="why-choose__header">
        <h2 className="why-choose__heading">{heading}</h2>
      </div>

      <div className="container">
        <div className="why-choose__grid">
          {items.map((item, i) => (
            <div key={i} className="why-choose__item">
              <h3 className="why-choose__item-title">{item.title}</h3>

              {item.description && (
                <p className="why-choose__item-desc">{item.description}</p>
              )}

              {item.bullets && item.bullets.length > 0 && (
                <ul className="why-choose__bullets">
                  {item.bullets.map((b, j) => (
                    <li key={j} className="why-choose__bullet">
                      <BulletIcon className="why-choose__bullet-icon" />
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
