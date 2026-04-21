import type { CollectionConfig } from "payload";

export const ContactSubmissions: CollectionConfig = {
  slug: "contact-submissions",
  admin: {
    group: "Data",
    useAsTitle: "name",
    defaultColumns: ["name", "email", "topic", "status", "createdAt"],
    description: "Submissions from the Contact Us form.",
  },
  access: {
    create: () => true,
    read: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => !!req.user,
  },
  hooks: {
    afterRead: [
      async ({ doc, req, context, findMany }) => {
        // Only auto-mark as read for authenticated admin requests
        if (!req.user) return doc;
        // Don't mark as read from the list view — only when opened individually
        if (findMany) return doc;
        // Break the infinite loop — if we triggered this read ourselves, skip
        if (context.skipStatusUpdate) return doc;
        // Only act when the current status is 'new'
        if (doc.status !== "new") return doc;

        await req.payload.update({
          collection: "contact-submissions",
          id: doc.id,
          data: { status: "read" },
          overrideAccess: true,
          context: { skipStatusUpdate: true },
        });

        return { ...doc, status: "read" };
      },
    ],
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      label: "Name",
    },
    {
      name: "email",
      type: "email",
      required: true,
      label: "Email",
    },
    {
      name: "phone",
      type: "text",
      label: "Phone",
    },
    {
      name: "topic",
      type: "text",
      label: "Topic",
    },
    {
      name: "message",
      type: "textarea",
      label: "Message",
    },
    {
      name: "status",
      type: "select",
      label: "Status",
      defaultValue: "new",
      admin: {
        position: "sidebar",
      },
      options: [
        { label: "🔵 New",      value: "new"  },
        { label: "✓ Read",      value: "read" },
      ],
    },
  ],
  timestamps: true,
};
