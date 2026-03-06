import { Link } from "@remix-run/react";
import { resolveMediaUrl } from "~/lib/payload";
import type { HighlightCalloutItem } from "~/lib/payload";

const BG_COLORS: Record<string, string> = {
  blue:  "var(--color-blue)",
  red:   "var(--color-red)",
  grey:  "var(--color-bg-card-alt)",
  white: "#ffffff",
};

interface Props {
  items: HighlightCalloutItem[];
  oddItemPlacement?: "first" | "last";
}

export default function HighlightCallouts({ items, oddItemPlacement = "first" }: Props) {
  if (!items || items.length === 0) return null;

  const gridClass = `container highlight-callouts__grid highlight-callouts__grid--odd-${oddItemPlacement}`;

  return (
    <section className="highlight-callouts">
      <div className={gridClass}>
        {items.map((item) => {
          const imageUrl = resolveMediaUrl(item.backgroundImage?.url);
          const isLight = item.backgroundColor === "white" && !imageUrl;
          const bgColor = item.backgroundColor ? BG_COLORS[item.backgroundColor] : BG_COLORS.grey;

          return (
            <div
              key={item.id}
              className={`highlight-callout${isLight ? " highlight-callout--light" : ""}`}
              style={!imageUrl ? { backgroundColor: bgColor } : undefined}
            >
              {imageUrl && (
                <>
                  <img
                    className="highlight-callout__bg-img"
                    src={imageUrl}
                    alt=""
                    aria-hidden="true"
                  />
                  <div className="highlight-callout__tint" />
                </>
              )}

              <div className="highlight-callout__content">
                <h3 className="highlight-callout__title">{item.title}</h3>
                <p className="highlight-callout__subtext">{item.subtext}</p>

                {item.button?.label && item.button?.url && (
                  item.button.url.startsWith("http") ? (
                    <a
                      href={item.button.url}
                      className="btn btn--outline btn--sm highlight-callout__btn"
                      target={item.button.openInNewTab ? "_blank" : undefined}
                      rel={item.button.openInNewTab ? "noopener noreferrer" : undefined}
                    >
                      {item.button.label}
                    </a>
                  ) : (
                    <Link
                      to={item.button.url}
                      className="btn btn--outline btn--sm highlight-callout__btn"
                      target={item.button.openInNewTab ? "_blank" : undefined}
                      rel={item.button.openInNewTab ? "noopener noreferrer" : undefined}
                    >
                      {item.button.label}
                    </Link>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
