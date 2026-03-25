import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_settings"
      ADD COLUMN IF NOT EXISTS "logo_print_id" integer;
  `)

  await db.execute(sql`
    ALTER TABLE "site_settings"
      ADD CONSTRAINT "site_settings_logo_print_id_media_id_fk"
        FOREIGN KEY ("logo_print_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "site_settings_logo_print_idx"
      ON "site_settings" USING btree ("logo_print_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_settings"
      DROP CONSTRAINT IF EXISTS "site_settings_logo_print_id_media_id_fk";
  `)

  await db.execute(sql`
    DROP INDEX IF EXISTS "site_settings_logo_print_idx";
  `)

  await db.execute(sql`
    ALTER TABLE "site_settings"
      DROP COLUMN IF EXISTS "logo_print_id";
  `)
}
