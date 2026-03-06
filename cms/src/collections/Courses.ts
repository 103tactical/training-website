import type { CollectionConfig } from "payload";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import {
  BoldFeature,
  ItalicFeature,
  UnderlineFeature,
  LinkFeature,
  UnorderedListFeature,
  ParagraphFeature,
  FixedToolbarFeature,
} from "@payloadcms/richtext-lexical";

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
      name: "description",
      type: "richText",
      label: "Description",
      admin: {
        description: "Full course description. Supports bold, italic, underline, links, and bullet lists.",
      },
      editor: lexicalEditor({
        features: [
          ParagraphFeature(),
          BoldFeature(),
          ItalicFeature(),
          UnderlineFeature(),
          UnorderedListFeature(),
          LinkFeature(),
          FixedToolbarFeature(),
        ],
      }),
    },
    {
      name: "durationHours",
      type: "number",
      label: "Total Hours",
      min: 0,
      admin: {
        description: "Total number of hours required to complete this course (e.g. 18).",
      },
    },
    {
      name: "durationDays",
      type: "number",
      label: "Total Days",
      min: 1,
      admin: {
        description: "Number of calendar days required to complete this course (e.g. 3).",
      },
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
