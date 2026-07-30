import type { CourseDisplayDiscount } from "~/lib/payload";

/**
 * Course price display. When a publicly advertised discount code applies,
 * shows the real price struck through, the discounted price, and the code
 * (customers still enter/see the code at checkout — the booking page
 * auto-applies it). Surcharges are never part of this display.
 */
export default function CoursePrice({
  price,
  discount,
  className,
}: {
  price: number;
  discount?: CourseDisplayDiscount | null;
  className: string;
}) {
  if (!discount) {
    return <p className={className}>${price.toLocaleString()}</p>;
  }
  return (
    <p className={className}>
      <s className="course-price__original">${price.toLocaleString()}</s>{" "}
      <span>${discount.discountedPrice.toLocaleString()}</span>
      <span className="course-price__code">with code {discount.code}</span>
    </p>
  );
}
