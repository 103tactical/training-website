import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Stores the Square checkout URL on pending_bookings so admins can re-copy
 * a payment link after sending it (session page outstanding-links list and
 * the Pending Booking record). Website checkouts don't need it (the visitor
 * is redirected immediately) — populated for admin-sent links.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "pending_bookings" ADD COLUMN IF NOT EXISTS "checkout_url" text;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "pending_bookings" DROP COLUMN IF EXISTS "checkout_url";
  `)
}
