import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds Square payment tracking fields to the bookings table.
 *
 * - square_order_id   : Square Order ID — stored at booking creation time
 *                       and used to look up a booking from a webhook event.
 * - square_payment_id : Square Payment ID — needed to issue refunds via the
 *                       Square Refunds API.
 * - amount_paid_cents : Amount the attendee paid, in cents (e.g. 20000 = $200).
 *
 * All columns are nullable so existing manual bookings are unaffected.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "bookings"
      ADD COLUMN IF NOT EXISTS "square_order_id"   varchar(255),
      ADD COLUMN IF NOT EXISTS "square_payment_id" varchar(255),
      ADD COLUMN IF NOT EXISTS "amount_paid_cents" integer
  `)

  // Index on square_order_id so webhook lookups are fast
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "bookings_square_order_id_idx"
      ON "bookings" ("square_order_id")
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP INDEX IF EXISTS "bookings_square_order_id_idx"`)
  await db.execute(sql`
    ALTER TABLE "bookings"
      DROP COLUMN IF EXISTS "square_order_id",
      DROP COLUMN IF EXISTS "square_payment_id",
      DROP COLUMN IF EXISTS "amount_paid_cents"
  `)
}
