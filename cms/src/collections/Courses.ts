import { APIError } from "payload";
import type { CollectionConfig, CollectionBeforeChangeHook, CollectionBeforeDeleteHook } from "payload";
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

/**
 * Prevent deleting a course that still has sessions linked to it.
 * The admin must remove all sessions first.
 */
const beforeDeleteHook: CollectionBeforeDeleteHook = async ({ id, req }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = req.payload as any
  const result = await p.find({
    collection: 'course-schedules',
    where: { course: { equals: id } },
    limit: 1,
    req,
  })
  if (result.totalDocs > 0) {
    throw new APIError(
      'Cannot delete this course — it has one or more sessions linked to it. ' +
      'Delete all sessions for this course first, then delete the course.',
      400, undefined, true,
    )
  }
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
  disableDuplicate: true,
  access: {
    read: () => true,
  },
  hooks: {
    beforeChange: [generateSlug],
    beforeDelete: [beforeDeleteHook],
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
    // ── Enrollment Forms ──────────────────────────────────────────────────────
    {
      type: "collapsible",
      label: "Enrollment Forms",
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: "enrollmentMessage",
          type: "textarea",
          label: "Message / Instructions",
          admin: {
            description:
              "Optional. When filled in, a branded email with this message (and the PDF below if provided) " +
              "will be sent automatically to every attendee upon payment confirmation. " +
              "e.g. instructions for completing the attached form before the course date.",
          },
        },
        {
          name: "enrollmentFile",
          type: "upload",
          relationTo: "media",
          label: "Enrollment Document",
          admin: {
            description: "PDF, JPG, Word (.doc/.docx), or TXT · Max 8 MB. This file will be attached to the enrollment email.",
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          validate: async (value: any, { req }: any) => {
            if (!value) return true
            const allowed = new Set([
              'application/pdf',
              'image/jpeg',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'text/plain',
            ])
            try {
              const id = typeof value === "object" ? value?.id : value
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const media = await (req?.payload as any)?.findByID({ collection: "media", id, req })
              if (media?.mimeType && !allowed.has(media.mimeType)) {
                return "Only PDF, JPG, Word (.doc/.docx), and TXT files are accepted for the Enrollment Document."
              }
              const maxBytes = 8 * 1024 * 1024
              if (media?.filesize && media.filesize > maxBytes) {
                return `File exceeds the 8 MB limit (uploaded: ${(media.filesize / 1024 / 1024).toFixed(1)} MB).`
              }
            } catch {
              // If the look-up fails, allow save — don't block on a network hiccup
            }
            return true
          },
        },
      ],
    },

    {
      name: "isActive",
      type: "checkbox",
      label: "Active (show on site)",
      defaultValue: true,
      validate: (value, { data }) => {
        if (value !== true) return true;
        const d = data as Record<string, unknown>;
        const missing: string[] = [];
        if (!d.title) missing.push("Course Title");
        if (d.price == null) missing.push("Price");
        if (d.durationHours == null) missing.push("Total Hours");
        if (d.durationDays == null) missing.push("Total Days");
        if (!d.thumbnail) missing.push("Card Image");
        if (missing.length > 0) {
          return `Cannot mark as Active until the following ${missing.length === 1 ? "field is" : "fields are"} filled in: ${missing.join(", ")}.`;
        }
        return true;
      },
    },
  ],
};
