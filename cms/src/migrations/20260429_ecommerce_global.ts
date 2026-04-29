import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Create the new e_commerce global table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "e_commerce" (
      "id"                                      serial PRIMARY KEY NOT NULL,
      "payments_credit_card_surcharge_percent"  numeric DEFAULT 0,
      "payments_credit_card_fixed_fee_cents"    numeric DEFAULT 30,
      "updated_at"                              timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"                              timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)

  // Copy existing values from site_settings into the new table
  await db.execute(sql`
    INSERT INTO "e_commerce" (
      "payments_credit_card_surcharge_percent",
      "payments_credit_card_fixed_fee_cents"
    )
    SELECT
      COALESCE("payments_credit_card_surcharge_percent", 0),
      COALESCE("payments_credit_card_fixed_fee_cents", 30)
    FROM "site_settings"
    LIMIT 1;
  `)

  // Drop the now-migrated columns from site_settings
  await db.execute(sql`
    ALTER TABLE "site_settings" DROP COLUMN IF EXISTS "payments_credit_card_surcharge_percent";
  `)
  await db.execute(sql`
    ALTER TABLE "site_settings" DROP COLUMN IF EXISTS "payments_credit_card_fixed_fee_cents";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Restore columns to site_settings
  await db.execute(sql`
    ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "payments_credit_card_surcharge_percent" numeric DEFAULT 0;
  `)
  await db.execute(sql`
    ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "payments_credit_card_fixed_fee_cents" numeric DEFAULT 30;
  `)

  // Drop the e_commerce table
  await db.execute(sql`
    DROP TABLE IF EXISTS "e_commerce" CASCADE;
  `)
}
