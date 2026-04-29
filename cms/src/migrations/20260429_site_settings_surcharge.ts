import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "payments_credit_card_surcharge_percent" numeric DEFAULT 0;
  `)
  await db.execute(sql`
    ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "payments_credit_card_fixed_fee_cents" numeric DEFAULT 30;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_settings" DROP COLUMN IF EXISTS "payments_credit_card_surcharge_percent";
  `)
  await db.execute(sql`
    ALTER TABLE "site_settings" DROP COLUMN IF EXISTS "payments_credit_card_fixed_fee_cents";
  `)
}
