import { timingSafeEqual } from "crypto";
import type { CollectionConfig } from "payload";
import { optionalPhoneValidate, phoneBeforeValidate } from "../lib/phone";

/**
 * Constant-time comparison of two strings to prevent timing attacks.
 * Returns true only if both strings are identical in length and content.
 */
function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Allow access from:
 *   1. A logged-in Payload admin user (admin UI / session)
 *   2. The website backend presenting the shared CMS_WRITE_SECRET bearer token
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function allowAccess({ req }: { req: any }): boolean {
  if (req?.user) return true;
  const auth: string = req?.headers?.get?.("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const secret = process.env.CMS_WRITE_SECRET ?? "";
  return safeCompare(token, secret);
}

export const ContactSubmissions: CollectionConfig = {
  slug: "contact-submissions",
  admin: {
    group: "Data",
    useAsTitle: "name",
    defaultColumns: ["name", "email", "topic", "status", "createdAt"],
    description: "Submissions from the Contact Us form.",
  },
  access: {
    create: allowAccess,
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

        // `req` MUST be passed so this update joins the parent operation's
        // transaction. Payload's delete runs afterRead hooks INSIDE its own
        // transaction with the row already locked — an update issued without
        // `req` takes a second connection and deadlocks against it forever
        // (silent hang, leaked connections, no log output). Deleting a "new"
        // submission froze the CMS this way on 2026-08-05.
        try {
          await req.payload.update({
            collection: "contact-submissions",
            id: doc.id,
            data: { status: "read" },
            depth: 0,
            overrideAccess: true,
            req,
            context: { skipStatusUpdate: true },
          });
        } catch {
          // Non-fatal — e.g. the row is being deleted in this very
          // transaction. Never block the read/delete over a status stamp.
        }

        return { ...doc, status: "read" };
      },
    ],
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      maxLength: 200,
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
      validate: optionalPhoneValidate,
      hooks: { beforeValidate: [phoneBeforeValidate] },
    },
    {
      name: "topic",
      type: "text",
      maxLength: 100,
      label: "Topic",
    },
    {
      name: "message",
      type: "textarea",
      maxLength: 5000,
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
