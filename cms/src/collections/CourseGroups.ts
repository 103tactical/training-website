import type { CollectionConfig } from "payload";

export const CourseGroups: CollectionConfig = {
  slug: "course-groups",
  admin: {
    useAsTitle: "title",
    group: "Course Management",
    description: "Create and manage course groups. Each group has a title and an ordered list of courses.",
  },
  access: {
    read: () => true,
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
};
