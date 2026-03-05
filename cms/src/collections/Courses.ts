import type { CollectionConfig } from "payload";

export const Courses: CollectionConfig = {
  slug: "courses",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "price", "isActive"],
    description: "Manage courses. Fields will be expanded as the site grows.",
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      label: "Course Title",
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      label: "Slug",
      admin: {
        description: "URL-friendly identifier, e.g. nys-ccw-class",
      },
    },
    {
      name: "thumbnail",
      type: "upload",
      relationTo: "media",
      label: "Card Image",
      admin: {
        description: "Image shown on course cards (home page and courses page).",
      },
    },
    {
      name: "summary",
      type: "array",
      label: "Bullet Point Summary",
      admin: {
        description: "Short bullet points shown on the course card.",
      },
      fields: [
        {
          name: "item",
          type: "text",
          required: true,
        },
      ],
    },
    {
      name: "price",
      type: "number",
      label: "Price ($)",
      min: 0,
    },
    {
      name: "isActive",
      type: "checkbox",
      label: "Active (show on site)",
      defaultValue: true,
    },
  ],
};
