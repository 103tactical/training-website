import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Add column, constraint, and index defensively — safe to run even if partially applied
  await db.execute(sql`
    DO $$ BEGIN
      -- Add column if missing
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_settings' AND column_name = 'logo_print_id'
      ) THEN
        ALTER TABLE "site_settings" ADD COLUMN "logo_print_id" integer;
      END IF;

      -- Add FK constraint if missing
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'site_settings_logo_print_id_media_id_fk'
      ) THEN
        ALTER TABLE "site_settings"
          ADD CONSTRAINT "site_settings_logo_print_id_media_id_fk"
            FOREIGN KEY ("logo_print_id") REFERENCES "public"."media"("id")
            ON DELETE set null ON UPDATE no action;
      END IF;

      -- Add index if missing
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'site_settings' AND indexname = 'site_settings_logo_print_idx'
      ) THEN
        CREATE INDEX "site_settings_logo_print_idx"
          ON "site_settings" USING btree ("logo_print_id");
      END IF;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_settings"
      DROP CONSTRAINT IF EXISTS "site_settings_logo_print_id_media_id_fk";
    DROP INDEX IF EXISTS "site_settings_logo_print_idx";
    ALTER TABLE "site_settings"
      DROP COLUMN IF EXISTS "logo_print_id";
  `)
}
