import type { GlobalConfig } from "payload";

export const ECommerce: GlobalConfig = {
  slug: "e-commerce",
  label: "E-Commerce",
  access: {
    read: () => true,
  },
  admin: {
    group: "Accounting & Reports",
    description: "Configure payment processing for online bookings. See the Operations Guide below for how to handle manual payments and refunds.",
    components: {
      afterFields: ['@/components/ECommerceGuide'],
    },
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

  ],
};
