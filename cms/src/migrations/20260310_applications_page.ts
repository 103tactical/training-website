import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "applications_page" (
      "id"              serial PRIMARY KEY NOT NULL,
      "hero_image_id"   integer,
      "header_title"    varchar,
      "header_subtext"  varchar,
      "updated_at"      timestamp(3) with time zone,
      "created_at"      timestamp(3) with time zone
    );

    ALTER TABLE "applications_page"
      ADD CONSTRAINT "applications_page_hero_image_id_media_id_fk"
        FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;

    CREATE INDEX IF NOT EXISTS "applications_page_hero_image_idx"
      ON "applications_page" USING btree ("hero_image_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "applications_page";`)
}
