import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds discount tracking to bookings: the code applied at checkout and the
 * amount it took off the course price (cents). amount_paid_cents already
 * reflects the discounted total actually charged — these columns exist so
 * reporting can show gross price vs. discount given.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "discount_code" varchar(32);
  `)
  await db.execute(sql`
    ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "discount_cents" numeric;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "bookings" DROP COLUMN IF EXISTS "discount_cents";
  `)
  await db.execute(sql`
    ALTER TABLE "bookings" DROP COLUMN IF EXISTS "discount_code";
  `)
}
