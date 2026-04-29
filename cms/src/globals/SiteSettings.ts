import type { GlobalConfig } from "payload";

export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  label: "Site Settings",
  access: {
    read: () => true,
  },
  admin: {
    description: "Global site configuration: navigation, footer content, and contact info.",
  },
  fields: [
    // ── Site Logos ────────────────────────────────────────────────────────────
    {
      type: "collapsible",
      label: "Site Logos",
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: "logoHeaderStackedColor",
          type: "upload",
          relationTo: "media",
          label: "Logo — Stacked / Color",
          admin: {
            description: "Full-color stacked logo. Used on mobile for pages without a hero image, and as a fallback.",
          },
        },
        {
          name: "logoHeaderStackedWhite",
          type: "upload",
          relationTo: "media",
          label: "Logo — Stacked / White",
          admin: {
            description: "Knockout white stacked logo. Used on mobile for pages with a dark hero image (Courses, Applications, Contact).",
          },
        },
        {
          name: "logoHeaderWideColor",
          type: "upload",
          relationTo: "media",
          label: "Logo — Wide / Color",
          admin: {
            description: "Full-color horizontal logo. Used on desktop for pages without a hero image. Falls back to Stacked / Color if not set.",
          },
        },
        {
          name: "logoHeaderWideWhite",
          type: "upload",
          relationTo: "media",
          label: "Logo — Wide / White",
          admin: {
            description: "Knockout white horizontal logo. Used on desktop for pages with a dark hero image. Falls back to Stacked / White if not set.",
          },
        },
        {
          name: "logoFooter",
          type: "upload",
          relationTo: "media",
          label: "Logo — Footer",
          admin: {
            description: "Displayed in the site footer.",
          },
        },
        {
          name: "logoPrint",
          type: "upload",
          relationTo: "media",
          label: "Logo — Print",
          admin: {
            description: "Solid black logo used at the top of printed rosters and documents. Upload a black version of the stacked logo.",
          },
        },
      ],
    },

    // ── Navigation ────────────────────────────────────────────────────────────
    {
      name: "nav",
      type: "array",
      label: "Navigation Links",
      fields: [
        {
          name: "label",
          type: "text",
          required: true,
        },
        {
          name: "url",
          type: "text",
          required: true,
          admin: {
            description: "Use /path for internal links or https:// for external.",
          },
        },
        {
          name: "openInNewTab",
          type: "checkbox",
          label: "Open in new tab",
          defaultValue: false,
        },
      ],
    },

    // ── Contact & Social ──────────────────────────────────────────────────────
    {
      name: "contact",
      type: "group",
      label: "Contact Info",
      fields: [
        {
          name: "address",
          type: "text",
          label: "Address",
        },
        {
          name: "city",
          type: "text",
          label: "City, State, ZIP",
        },
        {
          name: "phone",
          type: "text",
          label: "Phone",
        },
        {
          name: "email",
          type: "email",
          label: "Email",
        },
      ],
    },
    {
      name: "social",
      type: "array",
      label: "Social Links",
      fields: [
        {
          name: "platform",
          type: "select",
          required: true,
          options: [
            { label: "Facebook", value: "facebook" },
            { label: "Instagram", value: "instagram" },
            { label: "X / Twitter", value: "twitter" },
            { label: "YouTube", value: "youtube" },
            { label: "TikTok", value: "tiktok" },
            { label: "LinkedIn", value: "linkedin" },
          ],
        },
        {
          name: "url",
          type: "text",
          required: true,
          label: "Profile URL",
        },
      ],
    },
    {
      name: "copyright",
      type: "text",
      label: "Copyright Line",
      defaultValue: "© 103 Tactical Training. All rights reserved.",
    },

    // ── SEO Defaults ──────────────────────────────────────────────────────────
    {
      name: "seo",
      type: "group",
      label: "SEO Defaults",
      admin: {
        description: "Fallback SEO values used when individual pages do not override them.",
      },
      fields: [
        {
          name: "title",
          type: "text",
          label: "Site Name (title suffix)",
          admin: {
            description: 'Appended to every page title, e.g. "Courses | 103 Tactical Training". Defaults to "103 Tactical Training".',
          },
        },
        {
          name: "description",
          type: "textarea",
          label: "Default Meta Description",
          admin: {
            description: "Used on pages that do not have their own description. Recommended: 120–160 characters.",
          },
        },
        {
          name: "ogImage",
          type: "upload",
          relationTo: "media",
          label: "Default Social Share Image",
          admin: {
            description: "Fallback image shown when any page is shared on social media or via text/email. Recommended: 1200×630px.",
          },
        },
      ],
    },
  ],
};
