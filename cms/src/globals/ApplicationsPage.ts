import type { GlobalConfig } from "payload";

export const ApplicationsPage: GlobalConfig = {
  slug: "applications-page",
  label: "Applications Page",
  admin: {
    group: "Pages",
    description: "Manage content for the Applications page.",
  },
  access: {
    read: () => true,
  },
  fields: [
    // ── Hero Image ────────────────────────────────────────────────────────
    {
      name: "heroImage",
      type: "upload",
      relationTo: "media",
      label: "Hero Image",
      admin: {
        description: "Background image displayed in the hero banner at the top of the page.",
      },
    },

    // ── Page Header ───────────────────────────────────────────────────────
    {
      name: "header",
      type: "group",
      label: "Header",
      fields: [
        {
          name: "title",
          type: "text",
          label: "Title",
          admin: {
            description: "Main heading displayed over the hero image.",
          },
        },
        {
          name: "subtext",
          type: "textarea",
          label: "Sub-text",
          admin: {
            description: "Supporting text displayed below the title.",
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
        description: "Override the default search engine and social sharing metadata for this page.",
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
