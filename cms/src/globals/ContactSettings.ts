import type { GlobalConfig } from "payload";

export const ContactSettings: GlobalConfig = {
  slug: "contact-settings",
  label: "Contact Page",
  access: {
    read: () => true,
  },
  admin: {
    group: "Pages",
    description: "Configure the contact form topics and other contact page settings.",
    hidden: true,
  },
  fields: [
    {
      name: "heroImage",
      type: "upload",
      relationTo: "media",
      label: "Hero Image",
      admin: {
        description: "Background image displayed behind the Contact Us header. Recommended: wide landscape, at least 1400px wide.",
      },
    },
    {
      name: "topics",
      type: "array",
      label: "Contact Form Topics",
      admin: {
        description: "Topics the visitor can select from on the contact form.",
      },
      fields: [
        {
          name: "label",
          type: "text",
          required: true,
          label: "Topic",
        },
      ],
    },

    // ── SEO ───────────────────────────────────────────────────────────────
    {
      name: "seo",
      type: "group",
      label: "SEO",
      admin: {
        description: "Override the default search engine and social sharing metadata for the Contact page.",
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
