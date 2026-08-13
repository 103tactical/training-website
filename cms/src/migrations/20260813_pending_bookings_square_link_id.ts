import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Square payment-link ID on pending bookings. Stamped when an admin-sent
 * payment link is created; lets the "Cancel & Release Seat" endpoint disable
 * the link AT SQUARE (DELETE /v2/online-checkout/payment-links/:id) so a
 * cancelled link can no longer be paid. Existing outstanding links are
 * backfilled from Square's ListPaymentLinks after deploy.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "pending_bookings" ADD COLUMN IF NOT EXISTS "square_payment_link_id" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "pending_bookings" DROP COLUMN IF EXISTS "square_payment_link_id";
  `)
}
