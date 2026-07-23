import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_bookings_payment_method" AS ENUM('online', 'square-manual', 'cash', 'check', 'other');
  `)
  await db.execute(sql`
    ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "payment_method" "enum_bookings_payment_method";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "bookings" DROP COLUMN IF EXISTS "payment_method";
  `)
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_bookings_payment_method";
  `)
}
