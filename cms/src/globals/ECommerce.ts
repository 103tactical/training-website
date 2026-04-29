import type { GlobalConfig } from "payload";

export const ECommerce: GlobalConfig = {
  slug: "e-commerce",
  label: "E-Commerce",
  access: {
    read: () => true,
  },
  admin: {
    group: "Accounting & Reports",
    description: "Payment processing configuration for online bookings.",
  },
  fields: [
    {
      name: "payments",
      type: "group",
      label: "Payment Settings",
      admin: {
        description:
          "Square charges a processing fee of 2.9% + $0.30 on every online payment. Rather than " +
          "absorbing that cost out of your course revenue, the site automatically calculates a small " +
          "surcharge and adds it to the customer's total — so after Square takes their cut, you " +
          "receive the full course price.\n\n" +
          "The customer sees the fee clearly broken down on the booking page before they pay, along " +
          "with a brief notice that it covers processing costs and is not more than what you pay Square.\n\n" +
          "Example — $100 course:\n" +
          "  Course fee:              $100.00\n" +
          "  Processing surcharge:    + $3.39\n" +
          "  Customer pays:           $103.39\n" +
          "  Square takes 2.9%+$0.30: − $3.39\n" +
          "  You receive:             $100.00\n\n" +
          "To disable the surcharge and absorb the fee yourself, set the percentage to 0. " +
          "Changes take effect within minutes — no redeployment needed.",
      },
      fields: [
        {
          name: "creditCardSurchargePercent",
          type: "number",
          label: "Credit Card Surcharge — Percentage (%)",
          defaultValue: 0,
          min: 0,
          max: 10,
          admin: {
            description:
              "The percentage component of Square's processing fee. " +
              "Square's standard API rate is 2.9 — enter 2.9. Set to 0 to disable the surcharge entirely.",
          },
        },
        {
          name: "creditCardFixedFeeCents",
          type: "number",
          label: "Credit Card Surcharge — Fixed Fee (cents)",
          defaultValue: 30,
          min: 0,
          admin: {
            description:
              "The flat per-transaction component of Square's fee, in cents. " +
              "Square's standard rate includes a $0.30 fixed fee — enter 30. " +
              "Both fields together ensure you fully recoup Square's exact fee on every transaction.",
          },
        },
      ],
    },

    // ── Operations Guide ──────────────────────────────────────────────────────
    {
      name: "operationsGuide",
      type: "group",
      label: "Operations Guide — Manual Bookings & Refunds",
      admin: {
        description:
          "COMMON SCENARIOS\n\n" +

          "Attendee booked and paid online — you want to cancel and refund them:\n" +
          "  → Set status to Cancelled. The refund to their card issues automatically.\n\n" +

          "Attendee booked and paid online — you want to cancel but NOT refund them:\n" +
          "  → Check 'Cancel without issuing a refund', then set status to Cancelled.\n\n" +

          "Attendee booked and paid online — you already refunded them manually (cash, Square POS):\n" +
          "  → Check 'Cancel without issuing a refund', enter the amount in 'Manual Refund Amount', then set status to Cancelled.\n\n" +

          "Attendee paid you directly (cash, Square POS, Terminal) — not through the website:\n" +
          "  → Go to Bookings → Create New, fill in the attendee and session, enter the amount in 'Amount Paid', set status to Confirmed.\n\n" +

          "Attendee paid you directly and you need to cancel and refund them:\n" +
          "  → Open the booking, enter the refund amount in 'Manual Refund Amount', set status to Cancelled.\n\n" +

          "Attendee paid you directly and you need to cancel but no refund is being given:\n" +
          "  → Open the booking and set status to Cancelled. Leave 'Manual Refund Amount' blank.\n\n" +

          "─────────────────────────────────────────────────────────────────────\n\n" +

          "KEY THINGS TO REMEMBER\n\n" +
          "  • All bookings should be recorded here, even if payment was collected in person.\n" +
          "  • 'Amount Paid' and 'Manual Refund Amount' use cents — $225.00 = 22500.\n" +
          "  • The CMS can only issue automatic refunds for bookings paid through the website.\n" +
          "  • 'Manual Refund Amount' never moves money — it is for record-keeping only.",
      },
      fields: [
        {
          name: "_placeholder",
          type: "text",
          admin: {
            hidden: true,
          },
        },
      ],
    },
  ],
};
