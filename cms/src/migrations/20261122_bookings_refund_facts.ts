import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Store refund FACTS on the booking instead of inferring them.
 *
 * Until 2026-11-22 nothing recorded what was actually refunded. The reports
 * counted every cancelled, card-paid booking as refunded in full, which
 * overstated refunds by the full amount of any booking cancelled WITHOUT a
 * refund (first seen: $515.24 on booking 193). They also used `updated_at` as
 * the cancellation date, which changes whenever a record is touched.
 *
 *   square_refunded_cents  what Square confirmed it refunded on this payment
 *   square_refunded_at     when Square confirmed it
 *   cancelled_at           when the booking was cancelled
 *
 * STRICTLY ADDITIVE: three nullable columns, no default, no existing row
 * modified. Types mirror the existing Payload columns on this table
 * (`manual_refund_amount_cents` numeric, timestamps timestamp(3) with time zone).
 * Idempotent: the columns were added to production by hand (guarded
 * transaction, after a verified backup) and the four existing cancelled
 * bookings were backfilled from Square before this code deployed, so reports
 * were never wrong in between.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "square_refunded_cents" numeric;
    ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "square_refunded_at" timestamp(3) with time zone;
    ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp(3) with time zone;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "bookings" DROP COLUMN IF EXISTS "cancelled_at";
    ALTER TABLE "bookings" DROP COLUMN IF EXISTS "square_refunded_at";
    ALTER TABLE "bookings" DROP COLUMN IF EXISTS "square_refunded_cents";
  `)
}
