import type { CollectionConfig, CollectionBeforeChangeHook } from "payload";
import {
  lexicalEditor,
  BoldFeature,
  ItalicFeature,
  UnderlineFeature,
  LinkFeature,
  UnorderedListFeature,
  ParagraphFeature,
  FixedToolbarFeature,
} from "@payloadcms/richtext-lexical";

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const generateSlug: CollectionBeforeChangeHook = ({ data }) => {
  if (data.title) {
    data.slug = toSlug(data.title);
  }
  return data;
};

export const Courses: CollectionConfig = {
  slug: "courses",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "price", "isActive"],
    description: "Manage courses. Fields will be expanded as the site grows.",
    group: "Course Management",
  },
  access: {
    read: () => true,
  },
  hooks: {
    beforeChange: [generateSlug],
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
      unique: true,
      label: "Slug",
      admin: {
        readOnly: true,
        description: "Auto-generated from the course title. Cannot be edited manually.",
        position: "sidebar",
      },
    },
    {
      name: "thumbnail",
      type: "upload",
      relationTo: "media",
      required: true,
      label: "Card Image",
      admin: {
        description: "Image shown on course cards (home page and courses page).",
      },
    },
    {
      name: "socialShareImage",
      type: "upload",
      relationTo: "media",
      label: "Social Share Image",
      admin: {
        description: "Image shown when this course is shared via social media, text message, or email. Recommended: 1200×630px. Falls back to the Card Image if not set.",
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
        features: () => [
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
      required: true,
      label: "Total Hours",
      min: 0,
      admin: {
        description: "Total number of hours required to complete this course (e.g. 18).",
      },
    },
    {
      name: "durationDays",
      type: "number",
      required: true,
      label: "Total Days",
      min: 1,
      admin: {
        description: "Number of calendar days required to complete this course (e.g. 3).",
      },
    },
    {
      name: "price",
      type: "number",
      required: true,
      label: "Price ($)",
      min: 0,
    },
    {
      name: "isActive",
      type: "checkbox",
      label: "Active (show on site)",
      defaultValue: true,
      validate: (value, { data }) => {
        if (value !== true) return true;
        const missing: string[] = [];
        if (!data.title) missing.push("Course Title");
        if (data.price == null) missing.push("Price");
        if (data.durationHours == null) missing.push("Total Hours");
        if (data.durationDays == null) missing.push("Total Days");
        if (!data.thumbnail) missing.push("Card Image");
        if (missing.length > 0) {
          return `Cannot mark as Active until the following ${missing.length === 1 ? "field is" : "fields are"} filled in: ${missing.join(", ")}.`;
        }
        return true;
      },
    },
  ],
};
