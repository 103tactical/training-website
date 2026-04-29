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
          "RECORDING A MANUAL PAYMENT\n\n" +
          "If you collect payment from a student outside of the website (cash, Square POS, Square Terminal, " +
          "or a manually sent Square invoice), you must record it in the CMS to keep revenue reporting accurate:\n\n" +
          "  1. Go to Course Management → Bookings → Create New.\n" +
          "  2. Select the Attendee (create one first if they don't exist).\n" +
          "  3. Select the Course and Session.\n" +
          "  4. In the 'Amount Paid (cents)' field, enter the amount collected in cents\n" +
          "     (e.g. $225.00 = 22500).\n" +
          "  5. Add a note in Admin Notes to describe how payment was taken.\n" +
          "  6. Set Booking Status to Confirmed and save.\n\n" +
          "The revenue will then appear in the Accounting Overview and Revenue Report.\n\n" +
          "─────────────────────────────────────────────────────────────────────\n\n" +
          "ISSUING A MANUAL REFUND\n\n" +
          "If you refund a student outside of the CMS (cash, Square Dashboard, POS, etc.), " +
          "you must also record it here so the refund appears in reporting:\n\n" +
          "  1. Go to Course Management → Bookings and open the relevant booking.\n" +
          "  2. Check 'Cancel without issuing a refund' — this prevents the CMS from\n" +
          "     also attempting a Square refund automatically.\n" +
          "  3. In the 'Manual Refund Amount (cents)' field that appears, enter the\n" +
          "     amount you refunded in cents (e.g. $225.00 = 22500).\n" +
          "  4. Set Booking Status to Cancelled and save.\n\n" +
          "The refund amount will appear in the Refunds & Cancellations report under 'Manual Refunds'.\n\n" +
          "─────────────────────────────────────────────────────────────────────\n\n" +
          "IMPORTANT — KEEPING DATA IN SYNC\n\n" +
          "For revenue and refund reports to stay accurate, all bookings and cancellations " +
          "should be recorded in the CMS regardless of where payment was taken. " +
          "Square's Dashboard is the authoritative source for raw transaction data, " +
          "but this CMS is the source of truth for course-level reporting, seat management, " +
          "and attendee records. If in doubt, record it here.",
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
