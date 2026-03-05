import type { GlobalConfig } from "payload";

export const ContactSettings: GlobalConfig = {
  slug: "contact-settings",
  label: "Contact Settings",
  access: {
    read: () => true,
  },
  admin: {
    description: "Configure the contact form topics and other contact page settings.",
  },
  fields: [
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
  ],
};
