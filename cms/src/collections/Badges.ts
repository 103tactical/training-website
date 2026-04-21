import type { CollectionConfig } from "payload";

export const Badges: CollectionConfig = {
  slug: "badges",
  admin: {
    group: 'Pages',
    useAsTitle: "name",
    defaultColumns: ["name", "url"],
    description: "Partner/affiliation badges shown on the home page. Each links to an external site.",
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      label: "Name",
      admin: {
        description: "Internal label, e.g. NYSRPA, Arthur Kill Sports, NRA",
      },
    },
    {
      name: "image",
      type: "upload",
      relationTo: "media",
      required: true,
      label: "Badge Image",
    },
    {
      name: "alt",
      type: "text",
      label: "Alt Text",
      admin: {
        description: "Accessibility description of the badge image.",
      },
    },
    {
      name: "url",
      type: "text",
      required: true,
      label: "Link URL",
      admin: {
        description: "External URL this badge links to.",
      },
    },
  ],
};
