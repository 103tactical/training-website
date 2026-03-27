import type { Field, GlobalConfig } from "payload";

function productFields(): Field[] {
  return [
    {
      name: "image",
      type: "upload",
      relationTo: "media",
      label: "Product Image",
    },
    {
      name: "badge",
      type: "text",
      label: "Badge",
      admin: {
        description: "Optional label overlaid on the image, e.g. New Arrival or Staff Pick.",
      },
    },
    {
      name: "brand",
      type: "text",
      label: "Brand",
    },
    {
      name: "name",
      type: "text",
      required: true,
      label: "Product Name",
    },
    {
      name: "caliber",
      type: "text",
      label: "Caliber / Gauge",
      admin: {
        description: "Optional. E.g. 9mm, .45 ACP, 12ga.",
      },
    },
    {
      name: "description",
      type: "textarea",
      label: "Description",
    },
    {
      name: "price",
      type: "number",
      label: "Price",
      admin: {
        description: "Only displayed if Show Prices is enabled on this page.",
      },
    },
  ];
}

export const StorePage: GlobalConfig = {
  slug: "store-page",
  label: "Store Page",
  access: {
    read: () => true,
  },
  admin: {
    group: "Pages",
    description: "Manage content for the Store page.",
  },
  fields: [
    // ── Hero ──────────────────────────────────────────────────────────────
    {
      name: "heroImage",
      type: "upload",
      relationTo: "media",
      label: "Hero Image",
      admin: {
        description: "Background image displayed in the hero banner at the top of the page.",
      },
    },
    {
      name: "header",
      type: "group",
      label: "Header",
      fields: [
        {
          name: "title",
          type: "text",
          label: "Title",
        },
        {
          name: "subtext",
          type: "textarea",
          label: "Sub-text",
        },
      ],
    },

    // ── Global price toggle ───────────────────────────────────────────────
    {
      name: "showPrices",
      type: "checkbox",
      label: "Show Prices",
      defaultValue: false,
      admin: {
        description: "When enabled, prices are displayed on all product cards and the featured product.",
      },
    },

    // ── Featured Product ──────────────────────────────────────────────────
    {
      name: "featuredProduct",
      type: "group",
      label: "Featured Product",
      fields: [
        {
          name: "heading",
          type: "text",
          label: "Section Heading",
          defaultValue: "This Week's Feature",
        },
        ...productFields(),
      ],
    },

    // ── Pistols ───────────────────────────────────────────────────────────
    {
      name: "pistolsSection",
      type: "group",
      label: "Pistols",
      fields: [
        {
          name: "heading",
          type: "text",
          label: "Section Heading",
          defaultValue: "Pistols",
        },
        {
          name: "products",
          type: "array",
          label: "Products",
          labels: { singular: "Product", plural: "Products" },
          fields: productFields(),
        },
      ],
    },

    // ── Rifles ────────────────────────────────────────────────────────────
    {
      name: "riflesSection",
      type: "group",
      label: "Rifles",
      fields: [
        {
          name: "heading",
          type: "text",
          label: "Section Heading",
          defaultValue: "Rifles",
        },
        {
          name: "products",
          type: "array",
          label: "Products",
          labels: { singular: "Product", plural: "Products" },
          fields: productFields(),
        },
      ],
    },

    // ── Shotguns ──────────────────────────────────────────────────────────
    {
      name: "shotgunsSection",
      type: "group",
      label: "Shotguns",
      fields: [
        {
          name: "heading",
          type: "text",
          label: "Section Heading",
          defaultValue: "Shotguns",
        },
        {
          name: "products",
          type: "array",
          label: "Products",
          labels: { singular: "Product", plural: "Products" },
          fields: productFields(),
        },
      ],
    },

    // ── Accessories ───────────────────────────────────────────────────────
    {
      name: "accessoriesSection",
      type: "group",
      label: "Accessories",
      fields: [
        {
          name: "heading",
          type: "text",
          label: "Section Heading",
          defaultValue: "Accessories",
        },
        {
          name: "items",
          type: "array",
          label: "Items",
          labels: { singular: "Item", plural: "Items" },
          fields: productFields(),
        },
      ],
    },

    // ── Visit CTA ─────────────────────────────────────────────────────────
    {
      name: "visitCta",
      type: "group",
      label: "Visit Us CTA",
      fields: [
        {
          name: "heading",
          type: "text",
          label: "Heading",
          defaultValue: "Ready to See It In Person?",
        },
        {
          name: "subtext",
          type: "textarea",
          label: "Sub-text",
          admin: {
            description: "Supporting text below the heading.",
          },
        },
        {
          name: "directionsUrl",
          type: "text",
          label: "Directions URL",
          admin: {
            description: "Google Maps link for the Get Directions button.",
          },
        },
      ],
    },

    // ── SEO ───────────────────────────────────────────────────────────────
    {
      name: "seo",
      type: "group",
      label: "SEO",
      admin: {
        description: "Override the default search engine and social sharing metadata for the Store page.",
      },
      fields: [
        {
          name: "title",
          type: "text",
          label: "SEO Title",
          admin: {
            description: 'Overrides the browser tab / search result title. Leave blank to use the site default.',
          },
        },
        {
          name: "description",
          type: "textarea",
          label: "Meta Description",
          admin: {
            description: "Shown in search results and link previews. Recommended: 120–160 characters.",
          },
        },
        {
          name: "ogImage",
          type: "upload",
          relationTo: "media",
          label: "Social Share Image",
          admin: {
            description: "Image shown when this page is shared via social media, text message, or email. Recommended: 1200×630px.",
          },
        },
      ],
    },
  ],
};
