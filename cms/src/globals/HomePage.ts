import type { GlobalConfig } from "payload";

export const HomePage: GlobalConfig = {
  slug: "home-page",
  label: "Home Page",
  access: {
    read: () => true,
  },
  admin: {
    group: "Pages",
    description: "Manage page-specific content.",
  },
  fields: [
    // ── Website Headline ───────────────────────────────────────────────────
    {
      name: "websiteHeadlineSection",
      type: "group",
      label: "Website Headline",
      fields: [
        {
          name: "headline",
          type: "text",
          label: "Headline Text",
          admin: {
            description: "Large headline displayed above the featured carousel on the home page.",
          },
        },
      ],
    },

    // ── Featured Carousel ──────────────────────────────────────────────────
    {
      name: "featured",
      type: "array",
      label: "Featured Carousel",
      minRows: 1,
      admin: {
        description: "Add one or more slides. Wide asset is required; vertical (mobile) asset is optional.",
      },
      fields: [
        {
          name: "slideType",
          type: "select",
          required: true,
          label: "Slide Type",
          options: [
            { label: "Image", value: "image" },
            { label: "Image with Text & Button", value: "image-text" },
            { label: "Video", value: "video" },
          ],
        },
        // Wide (desktop / fallback) assets
        {
          name: "wideImage",
          type: "upload",
          relationTo: "media",
          label: "Wide Image (desktop / mobile fallback)",
          admin: {
            condition: (_, siblingData) =>
              siblingData?.slideType === "image" || siblingData?.slideType === "image-text",
            description: "Required. Used on desktop and as mobile fallback if no vertical image is set.",
          },
        },
        {
          name: "wideVideo",
          type: "upload",
          relationTo: "media",
          label: "Wide Video (desktop / mobile fallback)",
          admin: {
            condition: (_, siblingData) => siblingData?.slideType === "video",
            description: "Required. Used on desktop and as mobile fallback if no vertical video is set.",
          },
        },
        {
          name: "wideVideoPreview",
          type: "upload",
          relationTo: "media",
          label: "Wide Video — Preview Image",
          admin: {
            condition: (_, siblingData) => siblingData?.slideType === "video",
            description: "Optional. Shown before the user starts playback on desktop/wide view. Once playback begins, this image will not reappear on pause.",
          },
        },
        // Vertical (mobile) assets — optional
        {
          name: "verticalImage",
          type: "upload",
          relationTo: "media",
          label: "Vertical Image (mobile) — optional",
          admin: {
            condition: (_, siblingData) =>
              siblingData?.slideType === "image" || siblingData?.slideType === "image-text",
            description: "Optional. If provided, shown instead of the wide image on mobile.",
          },
        },
        {
          name: "verticalVideo",
          type: "upload",
          relationTo: "media",
          label: "Vertical Video (mobile) — optional",
          admin: {
            condition: (_, siblingData) => siblingData?.slideType === "video",
            description: "Optional. If provided, shown instead of the wide video on mobile.",
          },
        },
        {
          name: "verticalVideoPreview",
          type: "upload",
          relationTo: "media",
          label: "Vertical Video — Preview Image (mobile) — optional",
          admin: {
            condition: (_, siblingData) => siblingData?.slideType === "video",
            description: "Optional. Shown before the user starts playback on mobile/vertical view. Once playback begins, this image will not reappear on pause.",
          },
        },
        // Text overlay (image-text slides only)
        {
          name: "heading",
          type: "text",
          label: "Heading",
          admin: {
            condition: (_, siblingData) => siblingData?.slideType === "image-text",
          },
        },
        {
          name: "subtext",
          type: "textarea",
          label: "Subtext",
          admin: {
            condition: (_, siblingData) => siblingData?.slideType === "image-text",
          },
        },
        {
          name: "button",
          type: "group",
          label: "Button",
          admin: {
            condition: (_, siblingData) => siblingData?.slideType === "image-text",
          },
          fields: [
            {
              name: "label",
              type: "text",
              label: "Button Label",
            },
            {
              name: "url",
              type: "text",
              label: "Button URL",
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
      ],
    },

    // ── Featured Courses ──────────────────────────────────────────────────
    {
      name: "featuredCoursesSection",
      type: "group",
      label: "Featured Courses",
      fields: [
        {
          name: "courseGroup",
          type: "relationship",
          relationTo: "course-groups",
          label: "Course Group",
          admin: {
            description: "Select the course group to display on the home page. The group's title will be used as the section heading.",
          },
        },
      ],
    },

    // ── Highlight Callouts ────────────────────────────────────────────────
    {
      name: "highlightCallouts",
      type: "group",
      label: "Highlight Callouts",
      fields: [
        {
          name: "oddItemPlacement",
          type: "select",
          label: "Odd Item Placement",
          defaultValue: "first",
          admin: {
            description: "When the total number of callouts is odd, choose whether the lone full-width item appears first or last.",
          },
          options: [
            { label: "First — full-width item on top, pairs below", value: "first" },
            { label: "Last — pairs on top, full-width item on bottom", value: "last"  },
          ],
        },
        {
          name: "items",
          type: "array",
          label: "Items",
          labels: { singular: "Item", plural: "Items" },
          fields: [
            {
              name: "backgroundImage",
              type: "upload",
              relationTo: "media",
              label: "Background Image",
              admin: {
                description: "Optional. A dark tint overlay will be applied automatically.",
              },
            },
            {
              name: "backgroundColor",
              type: "select",
              label: "Background Color",
              admin: {
                description: "Used when no background image is set. White with no image will render dark text.",
              },
              options: [
                { label: "Blue",        value: "blue"  },
                { label: "Red",         value: "red"   },
                { label: "Medium Grey", value: "grey"  },
                { label: "White",       value: "white" },
              ],
            },
            {
              name: "title",
              type: "text",
              required: true,
              label: "Title",
            },
            {
              name: "subtext",
              type: "textarea",
              required: true,
              label: "Sub-text",
            },
            {
              name: "button",
              type: "group",
              label: "Button (optional)",
              fields: [
                { name: "label", type: "text",     label: "Button Label" },
                {
                  name: "url",
                  type: "text",
                  label: "Button URL",
                  admin: { description: "Use /path for internal links or https:// for external." },
                },
                { name: "openInNewTab", type: "checkbox", label: "Open in new tab", defaultValue: false },
              ],
            },
          ],
        },
      ],
    },

    // ── Testimonials ──────────────────────────────────────────────────────
    {
      name: "testimonialsSection",
      type: "group",
      label: "Testimonials",
      fields: [
        {
          name: "heading",
          type: "text",
          label: "Section Heading",
          admin: {
            description: "Optional heading above the testimonials row. Leave blank to show no heading.",
          },
        },
        {
          name: "items",
          type: "array",
          label: "Testimonials",
          labels: { singular: "Testimonial", plural: "Testimonials" },
          fields: [
            {
              name: "quote",
              type: "textarea",
              required: true,
              label: "Quote",
              admin: {
                description: "The testimonial text.",
              },
            },
            {
              name: "name",
              type: "text",
              required: true,
              label: "Name",
              admin: {
                description: "The person's name (e.g. "John D.").",
              },
            },
            {
              name: "context",
              type: "text",
              label: "Title / Context",
              admin: {
                description: "Optional. E.g. "Pistol Permit Course Graduate" or "NRA Safety Student".",
              },
            },
          ],
        },
      ],
    },

    // ── Details Section ───────────────────────────────────────────────────
    {
      name: "whyChoose",
      type: "group",
      label: "Details Section",
      fields: [
        {
          name: "heading",
          type: "text",
          label: "Section Heading",
          defaultValue: "Why Choose 103 Tactical?",
        },
        {
          name: "items",
          type: "array",
          label: "Items",
          fields: [
            {
              name: "icon",
              type: "select",
              label: "Icon",
              admin: {
                description: "Icon displayed to the left of the item title.",
              },
              options: [
                { label: "Staff",  value: "staff"  },
                { label: "Gun",    value: "gun"     },
                { label: "Course", value: "course"  },
                { label: "Shield", value: "shield"  },
                { label: "Badge",  value: "badge"   },
              ],
            },
            {
              name: "title",
              type: "text",
              required: true,
              label: "Title",
            },
            {
              name: "description",
              type: "textarea",
              label: "Description",
            },
            {
              name: "bullets",
              type: "array",
              label: "Bullet Points",
              fields: [
                {
                  name: "item",
                  type: "text",
                  required: true,
                },
              ],
            },
          ],
        },
      ],
    },

    // ── Badges ────────────────────────────────────────────────────────────
    {
      name: "badgesSection",
      type: "group",
      label: "Badges",
      fields: [
        {
          name: "heading",
          type: "text",
          label: "Section Heading",
          admin: {
            description: "Optional heading above the badges row. Leave blank to show no heading.",
          },
        },
        {
          name: "badges",
          type: "relationship",
          relationTo: "badges",
          hasMany: true,
          label: "Badges",
          admin: {
            description: "Select and order the badges to display on the home page.",
          },
        },
      ],
    },
  ],
};
