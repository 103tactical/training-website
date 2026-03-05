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
    {
      name: "logo",
      type: "upload",
      relationTo: "media",
      label: "Logo — Header",
    },
    {
      name: "logoFooter",
      type: "upload",
      relationTo: "media",
      label: "Logo — Footer",
      admin: {
        description: "Displayed in the site footer. Falls back to the Header logo if not set.",
      },
    },
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
  ],
};
