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
    defaultColumns: ["name", "email", "topic", "createdAt"],
    description:
      "A permanent record of every message sent through the website contact form. Each message also arrives in the info@ inbox — reply from there.",
  },
  access: {
    create: allowAccess,
    read: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => !!req.user,
  },
  // NOTE (2026-08-08): the new/read status field and its three coordinated
  // hooks were removed when dashboard Notifications took over the
  // "needs attention" role — this collection is now a plain archive. The
  // old `status` DB column is intentionally LEFT in place so a deploy
  // rollback (old code querying status) can never break; drop it in a
  // future migration once this has been stable for a while.
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
  ],
  timestamps: true,
};
