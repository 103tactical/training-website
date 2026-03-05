import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "contact_settings"
      ADD COLUMN IF NOT EXISTS "hero_image_id" integer;

    ALTER TABLE "contact_settings"
      ADD CONSTRAINT "contact_settings_hero_image_id_media_id_fk"
        FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;

    CREATE INDEX IF NOT EXISTS "contact_settings_hero_image_idx"
      ON "contact_settings" USING btree ("hero_image_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "contact_settings_hero_image_idx";
    ALTER TABLE "contact_settings" DROP CONSTRAINT IF EXISTS "contact_settings_hero_image_id_media_id_fk";
    ALTER TABLE "contact_settings" DROP COLUMN IF EXISTS "hero_image_id";
  `)
}
