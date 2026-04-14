import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { squareClient } from "~/lib/square.server";

export const meta: MetaFunction = () => [
  { title: "Booking Confirmed | 103 Tactical" },
  { name: "robots", content: "noindex" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCents(cents: number | bigint): string {
  const n = typeof cents === "bigint" ? Number(cents) : cents;
  return `$${(n / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

// ── Loader ────────────────────────────────────────────────────────────────────

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const orderId      = url.searchParams.get("orderId")      ?? "";
  const transactionId = url.searchParams.get("transactionId") ?? "";

  if (!orderId) {
    // Direct navigation without Square params — show generic success
    return json({ confirmed: false, orderId: "", transactionId: "", order: null });
  }

  let order: {
    id: string;
    lineItemName: string | null;
    lineItemNote: string | null;
    totalAmountCents: number;
    createdAt: string | null;
  } | null = null;

  if (squareClient) {
    try {
      const orderResp = await squareClient.orders.get({ orderId });
      const o = orderResp.order;
      if (o) {
        const totalCents = o.totalMoney?.amount ?? BigInt(0);
        const li = o.lineItems?.[0];
        order = {
          id: o.id ?? orderId,
          lineItemName: li?.name ?? null,
          lineItemNote: li?.note ?? null,
          totalAmountCents: Number(totalCents),
          createdAt: o.createdAt ?? null,
        };
      }
    } catch (err) {
      console.error("[booking-confirmation] Square order fetch failed:", err);
    }
  }

  return json({ confirmed: true, orderId, transactionId, order });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BookingConfirmationPage() {
  const { confirmed, orderId, order } = useLoaderData<typeof loader>();

  return (
    <div className="confirmation-page">
      <div className="confirmation-page__inner container">
        <div className="confirmation-card">

          {/* Check icon */}
          <div className="confirmation-card__icon" aria-hidden="true">
            <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="26" cy="26" r="25" stroke="currentColor" strokeWidth="2" />
              <path d="M14 27l8 8 16-16" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h1 className="confirmation-card__heading">
            {confirmed ? "You're Registered!" : "Booking Received"}
          </h1>

          {confirmed && order ? (
            <>
              <p className="confirmation-card__subtext">
                Your payment was successful. A receipt has been sent to your email by Square.
              </p>

              <div className="confirmation-card__details">
                {order.lineItemName && (
                  <div className="confirmation-detail">
                    <span className="confirmation-detail__label">Course</span>
                    <span className="confirmation-detail__value">{order.lineItemName}</span>
                  </div>
                )}
                {order.lineItemNote && (
                  <div className="confirmation-detail">
                    <span className="confirmation-detail__label">Session</span>
                    <span className="confirmation-detail__value">{order.lineItemNote}</span>
                  </div>
                )}
                {order.createdAt && (
                  <div className="confirmation-detail">
                    <span className="confirmation-detail__label">Booked On</span>
                    <span className="confirmation-detail__value">{formatDate(order.createdAt)}</span>
                  </div>
                )}
                <div className="confirmation-detail">
                  <span className="confirmation-detail__label">Amount Paid</span>
                  <span className="confirmation-detail__value">{formatCents(order.totalAmountCents)}</span>
                </div>
                <div className="confirmation-detail">
                  <span className="confirmation-detail__label">Confirmation #</span>
                  <span className="confirmation-detail__value confirmation-detail__value--mono">
                    {order.id}
                  </span>
                </div>
              </div>
            </>
          ) : confirmed ? (
            <p className="confirmation-card__subtext">
              Your payment was accepted. A receipt has been sent to your email.
              Your confirmation number is: <strong>{orderId}</strong>
            </p>
          ) : (
            <p className="confirmation-card__subtext">
              Thank you. If you just completed checkout, your booking is being processed.
            </p>
          )}

          <div className="confirmation-card__actions">
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => window.print()}
            >
              Print Confirmation
            </button>
            <Link to="/courses" className="btn btn--ghost">
              ← Browse More Courses
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
