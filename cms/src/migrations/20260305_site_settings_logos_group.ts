import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- Drop old constraints and indexes
    ALTER TABLE "site_settings"
      DROP CONSTRAINT IF EXISTS "site_settings_logo_footer_id_media_id_fk";
    DROP INDEX IF EXISTS "site_settings_logo_footer_idx";

    -- Rename columns to match new group field naming (logos__header_id, logos__footer_id)
    ALTER TABLE "site_settings"
      RENAME COLUMN "logo_id" TO "logos__header_id";
    ALTER TABLE "site_settings"
      RENAME COLUMN "logo_footer_id" TO "logos__footer_id";

    -- Re-add FK constraints under new names
    ALTER TABLE "site_settings"
      ADD CONSTRAINT "site_settings_logos__header_id_media_id_fk"
        FOREIGN KEY ("logos__header_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;
    ALTER TABLE "site_settings"
      ADD CONSTRAINT "site_settings_logos__footer_id_media_id_fk"
        FOREIGN KEY ("logos__footer_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;

    -- Re-add indexes under new names
    CREATE INDEX IF NOT EXISTS "site_settings_logos__header_idx"
      ON "site_settings" USING btree ("logos__header_id");
    CREATE INDEX IF NOT EXISTS "site_settings_logos__footer_idx"
      ON "site_settings" USING btree ("logos__footer_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_settings"
      DROP CONSTRAINT IF EXISTS "site_settings_logos__header_id_media_id_fk";
    ALTER TABLE "site_settings"
      DROP CONSTRAINT IF EXISTS "site_settings_logos__footer_id_media_id_fk";
    DROP INDEX IF EXISTS "site_settings_logos__header_idx";
    DROP INDEX IF EXISTS "site_settings_logos__footer_idx";

    ALTER TABLE "site_settings" RENAME COLUMN "logos__header_id" TO "logo_id";
    ALTER TABLE "site_settings" RENAME COLUMN "logos__footer_id" TO "logo_footer_id";

    ALTER TABLE "site_settings"
      ADD CONSTRAINT "site_settings_logo_footer_id_media_id_fk"
        FOREIGN KEY ("logo_footer_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;
    CREATE INDEX IF NOT EXISTS "site_settings_logo_footer_idx"
      ON "site_settings" USING btree ("logo_footer_id");
  `)
}
