import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Matches the existing hand-written pattern on this table: selects are
  // varchar(50) (see payment_method, status), not Postgres enums.
  await db.execute(sql`
    ALTER TABLE "private_group_bookings" ADD COLUMN IF NOT EXISTS "manual_payment_method" character varying(50);
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "private_group_bookings" DROP COLUMN IF EXISTS "manual_payment_method";
  `)
}
