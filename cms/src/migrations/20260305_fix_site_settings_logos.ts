import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Rename logos__header_id → logo_id if the rename from the logos-group migration ran
  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_settings' AND column_name = 'logos__header_id'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_settings' AND column_name = 'logo_id'
      ) THEN
        ALTER TABLE "site_settings" DROP CONSTRAINT IF EXISTS "site_settings_logos__header_id_media_id_fk";
        DROP INDEX IF EXISTS "site_settings_logos__header_idx";
        ALTER TABLE "site_settings" RENAME COLUMN "logos__header_id" TO "logo_id";
      END IF;
    END $$;
  `)

  // Rename logos__footer_id → logo_footer_id if the rename from the logos-group migration ran
  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_settings' AND column_name = 'logos__footer_id'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_settings' AND column_name = 'logo_footer_id'
      ) THEN
        ALTER TABLE "site_settings" DROP CONSTRAINT IF EXISTS "site_settings_logos__footer_id_media_id_fk";
        DROP INDEX IF EXISTS "site_settings_logos__footer_idx";
        ALTER TABLE "site_settings" RENAME COLUMN "logos__footer_id" TO "logo_footer_id";
      END IF;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // no-op
}
