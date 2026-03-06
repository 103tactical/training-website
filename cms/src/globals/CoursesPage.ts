import type { GlobalConfig } from "payload";

export const CoursesPage: GlobalConfig = {
  slug: "courses-page",
  label: "Courses Page",
  admin: {
    group: "Pages",
    description: "Manage content for the Courses page.",
  },
  access: {
    read: () => true,
  },
  fields: [
    // ── Hero Image ────────────────────────────────────────────────────────
    {
      name: "heroImage",
      type: "upload",
      relationTo: "media",
      label: "Hero Image",
      admin: {
        description: "Background image displayed in the hero banner at the top of the page.",
      },
    },

    // ── Page Header ───────────────────────────────────────────────────────
    {
      name: "header",
      type: "group",
      label: "Header",
      fields: [
        {
          name: "title",
          type: "text",
          label: "Title",
          admin: {
            description: "Main heading displayed over the hero image.",
          },
        },
        {
          name: "subtext",
          type: "textarea",
          label: "Sub-text",
          admin: {
            description: "Supporting text displayed below the title.",
          },
        },
      ],
    },

    // ── Course Groups ─────────────────────────────────────────────────────
    {
      name: "courseGroups",
      type: "array",
      label: "Course Groups",
      labels: {
        singular: "Group",
        plural: "Groups",
      },
      admin: {
        description: "Select and order the course groups to display on this page. All courses in the database are always listed below.",
      },
      fields: [
        {
          name: "group",
          type: "relationship",
          relationTo: "course-groups",
          required: true,
          label: "Course Group",
        },
      ],
    },
  ],
};
