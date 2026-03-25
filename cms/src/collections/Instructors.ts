import type { CollectionConfig } from 'payload'

export const Instructors: CollectionConfig = {
  slug: 'instructors',
  admin: {
    useAsTitle: 'name',
    group: 'Course Management',
    defaultColumns: ['name', 'title'],
    description: 'Manage instructors. Once added here, they can be assigned to any course session.',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Full Name',
      required: true,
    },
    {
      name: 'title',
      type: 'text',
      label: 'Title / Certification',
      admin: {
        description: 'e.g. "NRA Certified Instructor", "Lead Firearms Instructor"',
      },
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      label: 'Photo',
    },
  ],
}
