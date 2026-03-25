import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // 1. Rename logo_id → logo_header_stacked_color_id (preserves existing uploaded logo)
  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_settings' AND column_name = 'logo_id'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_settings' AND column_name = 'logo_header_stacked_color_id'
      ) THEN
        ALTER TABLE "site_settings" DROP CONSTRAINT IF EXISTS "site_settings_logo_id_media_id_fk";
        DROP INDEX IF EXISTS "site_settings_logo_idx";
        ALTER TABLE "site_settings" RENAME COLUMN "logo_id" TO "logo_header_stacked_color_id";
        ALTER TABLE "site_settings"
          ADD CONSTRAINT "site_settings_logo_header_stacked_color_id_media_id_fk"
            FOREIGN KEY ("logo_header_stacked_color_id") REFERENCES "public"."media"("id")
            ON DELETE set null ON UPDATE no action;
        CREATE INDEX IF NOT EXISTS "site_settings_logo_header_stacked_color_idx"
          ON "site_settings" USING btree ("logo_header_stacked_color_id");
      END IF;
    END $$;
  `)

  // 2. Rename logo_header_wide_id → logo_header_wide_color_id
  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_settings' AND column_name = 'logo_header_wide_id'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_settings' AND column_name = 'logo_header_wide_color_id'
      ) THEN
        ALTER TABLE "site_settings" DROP CONSTRAINT IF EXISTS "site_settings_logo_header_wide_id_media_id_fk";
        DROP INDEX IF EXISTS "site_settings_logo_header_wide_idx";
        ALTER TABLE "site_settings" RENAME COLUMN "logo_header_wide_id" TO "logo_header_wide_color_id";
        ALTER TABLE "site_settings"
          ADD CONSTRAINT "site_settings_logo_header_wide_color_id_media_id_fk"
            FOREIGN KEY ("logo_header_wide_color_id") REFERENCES "public"."media"("id")
            ON DELETE set null ON UPDATE no action;
        CREATE INDEX IF NOT EXISTS "site_settings_logo_header_wide_color_idx"
          ON "site_settings" USING btree ("logo_header_wide_color_id");
      END IF;
    END $$;
  `)

  // 3. Add logo_header_stacked_white_id (new)
  await db.execute(sql`
    ALTER TABLE "site_settings"
      ADD COLUMN IF NOT EXISTS "logo_header_stacked_white_id" integer;
    ALTER TABLE "site_settings"
      ADD CONSTRAINT "site_settings_logo_header_stacked_white_id_media_id_fk"
        FOREIGN KEY ("logo_header_stacked_white_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;
    CREATE INDEX IF NOT EXISTS "site_settings_logo_header_stacked_white_idx"
      ON "site_settings" USING btree ("logo_header_stacked_white_id");
  `)

  // 4. Add logo_header_wide_white_id (new)
  await db.execute(sql`
    ALTER TABLE "site_settings"
      ADD COLUMN IF NOT EXISTS "logo_header_wide_white_id" integer;
    ALTER TABLE "site_settings"
      ADD CONSTRAINT "site_settings_logo_header_wide_white_id_media_id_fk"
        FOREIGN KEY ("logo_header_wide_white_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;
    CREATE INDEX IF NOT EXISTS "site_settings_logo_header_wide_white_idx"
      ON "site_settings" USING btree ("logo_header_wide_white_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Reverse new columns
  await db.execute(sql`
    ALTER TABLE "site_settings"
      DROP CONSTRAINT IF EXISTS "site_settings_logo_header_wide_white_id_media_id_fk";
    ALTER TABLE "site_settings"
      DROP COLUMN IF EXISTS "logo_header_wide_white_id";
    ALTER TABLE "site_settings"
      DROP CONSTRAINT IF EXISTS "site_settings_logo_header_stacked_white_id_media_id_fk";
    ALTER TABLE "site_settings"
      DROP COLUMN IF EXISTS "logo_header_stacked_white_id";
  `)
}
