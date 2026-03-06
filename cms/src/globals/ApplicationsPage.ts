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
  ],
};
