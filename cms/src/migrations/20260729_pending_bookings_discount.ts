import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds discount tracking to pending_bookings: the normalized code applied
 * when the checkout was created, and the amount it took off the course
 * price (cents). Both ride through to the Booking when the webhook fires.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "pending_bookings" ADD COLUMN IF NOT EXISTS "discount_code" varchar(32);
  `)
  await db.execute(sql`
    ALTER TABLE "pending_bookings" ADD COLUMN IF NOT EXISTS "discount_cents" numeric;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "pending_bookings" DROP COLUMN IF EXISTS "discount_cents";
  `)
  await db.execute(sql`
    ALTER TABLE "pending_bookings" DROP COLUMN IF EXISTS "discount_code";
  `)
}
