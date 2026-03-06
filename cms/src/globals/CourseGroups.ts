import type { GlobalConfig } from "payload";

export const CourseGroups: GlobalConfig = {
  slug: "course-groups",
  label: "Course Groups",
  admin: {
    group: "Pages",
    description: "Define groups of courses for display on the website. Drag to reorder groups and courses within each group.",
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "groups",
      type: "array",
      label: "Course Groups",
      labels: {
        singular: "Group",
        plural: "Groups",
      },
      fields: [
        {
          name: "title",
          type: "text",
          required: true,
          label: "Group Title",
        },
        {
          name: "courses",
          type: "array",
          label: "Courses",
          labels: {
            singular: "Course",
            plural: "Courses",
          },
          fields: [
            {
              name: "course",
              type: "relationship",
              relationTo: "courses",
              required: true,
              label: "Course",
            },
          ],
        },
      ],
    },
  ],
};
