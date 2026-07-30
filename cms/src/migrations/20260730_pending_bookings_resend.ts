import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Resend support for admin payment links:
 *   link_sent_at     — when the link email was last sent (creation or resend);
 *                      the roster's awaiting-payment list shows this date
 *   link_total_cents — the total the Square link charges, captured at link
 *                      creation so resent emails quote the REAL amount even
 *                      if the course price changes later
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "pending_bookings" ADD COLUMN IF NOT EXISTS "link_sent_at" timestamp(3) with time zone;
  `)
  await db.execute(sql`
    ALTER TABLE "pending_bookings" ADD COLUMN IF NOT EXISTS "link_total_cents" numeric;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "pending_bookings" DROP COLUMN IF EXISTS "link_total_cents";
  `)
  await db.execute(sql`
    ALTER TABLE "pending_bookings" DROP COLUMN IF EXISTS "link_sent_at";
  `)
}
