import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "home_page_featured"
      ADD COLUMN IF NOT EXISTS "wide_video_preview_id" integer,
      ADD COLUMN IF NOT EXISTS "vertical_video_preview_id" integer;

    ALTER TABLE "home_page_featured"
      ADD CONSTRAINT "home_page_featured_wide_video_preview_id_media_id_fk"
        FOREIGN KEY ("wide_video_preview_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;

    ALTER TABLE "home_page_featured"
      ADD CONSTRAINT "home_page_featured_vertical_video_preview_id_media_id_fk"
        FOREIGN KEY ("vertical_video_preview_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;

    CREATE INDEX "home_page_featured_wide_video_preview_idx"
      ON "home_page_featured" USING btree ("wide_video_preview_id");

    CREATE INDEX "home_page_featured_vertical_video_preview_idx"
      ON "home_page_featured" USING btree ("vertical_video_preview_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "home_page_featured_wide_video_preview_idx";
    DROP INDEX IF EXISTS "home_page_featured_vertical_video_preview_idx";

    ALTER TABLE "home_page_featured"
      DROP CONSTRAINT IF EXISTS "home_page_featured_wide_video_preview_id_media_id_fk",
      DROP CONSTRAINT IF EXISTS "home_page_featured_vertical_video_preview_id_media_id_fk",
      DROP COLUMN IF EXISTS "wide_video_preview_id",
      DROP COLUMN IF EXISTS "vertical_video_preview_id";
  `)
}
