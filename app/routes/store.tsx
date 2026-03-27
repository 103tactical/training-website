import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/node";
import { getStorePage, resolveMediaUrl } from "~/lib/payload";
import type { StorePage, StoreProduct } from "~/lib/payload";
import { buildMeta, getRootSeoDefaults } from "~/lib/meta";

export const meta: MetaFunction<typeof loader> = ({ data, matches }) => {
  const { defaultOgImage, defaultSiteName } = getRootSeoDefaults(matches);
  const seo = data?.page?.seo;
  return buildMeta({
    pageTitle: seo?.title ?? "Store",
    siteName: defaultSiteName ?? "103 Tactical",
    description: seo?.description ?? "Browse 103 Tactical's selection of pistols, rifles, shotguns, and accessories. Visit us in-store on Staten Island, NY.",
    ogImage: seo?.ogImage?.url ? resolveMediaUrl(seo.ogImage.url) : defaultOgImage,
    canonicalUrl: data?.canonicalUrl,
  });
};

export async function loader({ request }: LoaderFunctionArgs) {
  const page = await getStorePage().catch(() => null);
  return json({ page, canonicalUrl: new URL(request.url).toString() });
}

export default function StoreRoute() {
  const { page } = useLoaderData<typeof loader>();
  const heroImageUrl = resolveMediaUrl(page?.heroImage?.url);
  const showPrices = page?.showPrices ?? false;

  const sections = [
    { key: "pistols",    data: page?.pistolsSection,     products: page?.pistolsSection?.products },
    { key: "rifles",     data: page?.riflesSection,      products: page?.riflesSection?.products },
    { key: "shotguns",   data: page?.shotgunsSection,    products: page?.shotgunsSection?.products },
  ];

  const accessories = page?.accessoriesSection;
  const cta = page?.visitCta;
  const featured = page?.featuredProduct;

  return (
    <div className="store-page">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="contact-page__hero courses-page__hero">
        {heroImageUrl && (
          <img
            className="contact-page__hero-img"
            src={heroImageUrl}
            alt={page?.heroImage?.alt ?? "Store"}
          />
        )}
        {(page?.header?.title || page?.header?.subtext) && (
          <div className="contact-page__hero-content courses-page__hero-content">
            {page?.header?.title && (
              <h1 className="contact-page__title">{page.header.title}</h1>
            )}
            {page?.header?.subtext && (
              <p className="contact-page__subtitle">{page.header.subtext}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Featured Product ─────────────────────────────────────────────── */}
      {featured?.name && (
        <section className="store-featured">
          <div className="container">
            <div className="store-featured__box">
              <h2 className="store-section__heading store-featured__label">
                {featured.heading ?? "This Week's Feature"}
              </h2>
              <div className="store-featured__inner">

            {/* Image */}
            <div className="store-featured__img-wrap">
              {featured.badge && (
                <span className="product-badge">{featured.badge}</span>
              )}
              {resolveMediaUrl(featured.image?.url) ? (
                <img
                  className="store-featured__img"
                  src={resolveMediaUrl(featured.image?.url)}
                  alt={featured.image?.alt ?? featured.name}
                />
              ) : (
                <div className="store-featured__img store-featured__img--placeholder" />
              )}
            </div>

            {/* Details */}
            <div className="store-featured__details">
              {featured.brand && (
                <p className="store-featured__brand">{featured.brand}</p>
              )}
              <h3 className="store-featured__name">{featured.name}</h3>
              {featured.caliber && (
                <p className="store-featured__caliber">{featured.caliber}</p>
              )}
              {featured.description && (
                <p className="store-featured__desc">{featured.description}</p>
              )}
              {showPrices && featured.price != null && (
                <p className="store-featured__price">
                  ${featured.price.toLocaleString()}
                </p>
              )}
              <div className="store-featured__cta-wrap">
                <span className="store-featured__in-store-tag">
                  <InStoreIcon /> In-Store Only
                </span>
                <Link to="/contact" className="btn btn--outline store-featured__cta-btn">
                  Schedule a Visit
                </Link>
              </div>
            </div>
            </div>{/* end store-featured__inner */}
          </div>{/* end store-featured__box */}
          </div>{/* end container */}
        </section>
      )}

      {/* ── Gun sections: Pistols / Rifles / Shotguns ────────────────────── */}
      {sections.map(({ key, data, products }) =>
        products && products.length > 0 ? (
          <section key={key} className="store-section">
            <div className="container">
              <h2 className="store-section__heading">
                {data?.heading ?? key.charAt(0).toUpperCase() + key.slice(1)}
              </h2>
              <div className="store-section__grid">
                {products.map((p: StoreProduct) => (
                  <ProductCard key={p.id} product={p} showPrices={showPrices} />
                ))}
              </div>
            </div>
          </section>
        ) : null
      )}

      {/* ── Accessories ──────────────────────────────────────────────────── */}
      {accessories?.items && accessories.items.length > 0 && (
        <section className="store-section store-section--accessories">
          <div className="container">
            <h2 className="store-section__heading">
              {accessories.heading ?? "Accessories"}
            </h2>
            <div className="store-section__grid store-section__grid--accessories">
              {accessories.items.map((p: StoreProduct) => (
                <ProductCard key={p.id} product={p} showPrices={showPrices} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Visit CTA ────────────────────────────────────────────────────── */}
      <section className="store-visit-cta">
        <div className="store-visit-cta__inner container">
          <div className="store-visit-cta__accent" aria-hidden="true" />
          <h2 className="store-visit-cta__heading">
            {cta?.heading ?? "Ready to See It In Person?"}
          </h2>
          {cta?.subtext && (
            <p className="store-visit-cta__subtext">{cta.subtext}</p>
          )}
          <div className="store-visit-cta__actions">
            {cta?.directionsUrl && (
              <a
                href={cta.directionsUrl}
                className="btn btn--accent store-visit-cta__btn"
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Directions
              </a>
            )}
            <Link to="/contact" className="btn btn--outline store-visit-cta__btn">
              Schedule a Visit
            </Link>
          </div>
          <p className="store-visit-cta__note">
            Our experts are here to guide you through every option — no obligation, just answers.
          </p>
        </div>
      </section>

    </div>
  );
}

/* ── Product Card ──────────────────────────────────────────────────────────── */

function ProductCard({ product, showPrices }: { product: StoreProduct; showPrices: boolean }) {
  const imgUrl = resolveMediaUrl(product.image?.url);

  return (
    <div className="product-card">
      <div className="product-card__img-wrap">
        {product.badge && (
          <span className="product-badge">{product.badge}</span>
        )}
        {imgUrl ? (
          <img
            className="product-card__img"
            src={imgUrl}
            alt={product.image?.alt ?? product.name}
          />
        ) : (
          <div className="product-card__img product-card__img--placeholder" />
        )}
      </div>

      <div className="product-card__body">
        {product.brand && (
          <p className="product-card__brand">{product.brand}</p>
        )}
        <h3 className="product-card__name">{product.name}</h3>
        {product.caliber && (
          <p className="product-card__caliber">{product.caliber}</p>
        )}
        {product.description && (
          <p className="product-card__desc">{product.description}</p>
        )}
        <div className="product-card__footer">
          {showPrices && product.price != null && (
            <p className="product-card__price">${product.price.toLocaleString()}</p>
          )}
          <span className="product-card__in-store">
            <InStoreIcon /> In-Store Only
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── In-store SVG icon ─────────────────────────────────────────────────────── */

function InStoreIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }}
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  );
}
