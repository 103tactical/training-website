import { timingSafeEqual } from "crypto";
import type { CollectionConfig } from "payload";

/**
 * Notifications — dismissable "needs your attention" reminders shown on the
 * admin dashboard bar and the Notifications page (/admin/notifications).
 *
 * Created by the WEBSITE (bearer token) when an event needs Bernie's action:
 *   - a contact-form message arrived (reply from the info@ inbox)
 *   - someone paid but was waitlisted (free a seat / move / refund)
 *   - a booking failed to create after payment (retry in Pending Bookings)
 *
 * Deliberately curated — informational events (normal bookings,
 * cancellations) do NOT create notifications; they stay email-only.
 * Dismissing sets `dismissed: true` (hidden, never deleted).
 *
 * This collection is intentionally NOT in CustomNav/AdminDashboard (same
 * exception as PendingBookings) — the Notifications PAGE is the UI; the raw
 * collection is just its storage.
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function allowAccess({ req }: { req: any }): boolean {
  if (req?.user) return true;
  const auth: string = req?.headers?.get?.("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const secret = process.env.CMS_WRITE_SECRET ?? "";
  return safeCompare(token, secret);
}

export const Notifications: CollectionConfig = {
  slug: "notifications",
  admin: {
    group: "Data",
    useAsTitle: "whatHappened",
    defaultColumns: ["whatHappened", "dismissed", "createdAt"],
    description:
      "Reminders shown on the dashboard. Managed from the Notifications page — you normally never need this list.",
  },
  access: {
    create: allowAccess,
    read: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => !!req.user,
  },
  fields: [
    {
      name: "whatHappened",
      type: "text",
      required: true,
      maxLength: 500,
      label: "What Happened",
    },
    {
      name: "whatToDo",
      type: "text",
      required: true,
      maxLength: 500,
      label: "What To Do",
    },
    {
      name: "link",
      type: "text",
      maxLength: 300,
      label: "Link",
      admin: {
        description: "Relative admin path the action button opens (e.g. /admin/collections/bookings/12).",
      },
    },
    {
      name: "linkLabel",
      type: "text",
      maxLength: 100,
      label: "Link Label",
    },
    {
      name: "dismissed",
      type: "checkbox",
      defaultValue: false,
      label: "Dismissed",
      admin: { position: "sidebar" },
    },
  ],
  timestamps: true,
};
