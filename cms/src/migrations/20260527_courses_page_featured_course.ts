import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // ── Add featured_course_* columns ─────────────────────────────────────────
  await db.execute(sql`
    ALTER TABLE "courses_page" ADD COLUMN IF NOT EXISTS "featured_course_enabled" boolean DEFAULT false;
  `)
  await db.execute(sql`
    ALTER TABLE "courses_page" ADD COLUMN IF NOT EXISTS "featured_course_eyebrow" varchar;
  `)
  await db.execute(sql`
    ALTER TABLE "courses_page" ADD COLUMN IF NOT EXISTS "featured_course_heading" varchar;
  `)
  await db.execute(sql`
    ALTER TABLE "courses_page" ADD COLUMN IF NOT EXISTS "featured_course_body" varchar;
  `)
  await db.execute(sql`
    ALTER TABLE "courses_page" ADD COLUMN IF NOT EXISTS "featured_course_image_id" integer;
  `)
  await db.execute(sql`
    ALTER TABLE "courses_page" ADD COLUMN IF NOT EXISTS "featured_course_badge" varchar;
  `)
  await db.execute(sql`
    ALTER TABLE "courses_page" ADD COLUMN IF NOT EXISTS "featured_course_button_label" varchar;
  `)
  await db.execute(sql`
    ALTER TABLE "courses_page" ADD COLUMN IF NOT EXISTS "featured_course_link_type" varchar(20) DEFAULT 'schedule';
  `)
  await db.execute(sql`
    ALTER TABLE "courses_page" ADD COLUMN IF NOT EXISTS "featured_course_course_id" integer;
  `)
  await db.execute(sql`
    ALTER TABLE "courses_page" ADD COLUMN IF NOT EXISTS "featured_course_custom_url" varchar;
  `)

  // ── Foreign keys ──────────────────────────────────────────────────────────
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "courses_page"
        ADD CONSTRAINT "courses_page_featured_course_image_id_media_id_fk"
          FOREIGN KEY ("featured_course_image_id") REFERENCES "public"."media"("id")
          ON DELETE set null ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "courses_page"
        ADD CONSTRAINT "courses_page_featured_course_course_id_courses_id_fk"
          FOREIGN KEY ("featured_course_course_id") REFERENCES "public"."courses"("id")
          ON DELETE set null ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `)

  // ── Indexes ───────────────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "courses_page_featured_course_image_idx"
      ON "courses_page" USING btree ("featured_course_image_id");
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "courses_page_featured_course_course_idx"
      ON "courses_page" USING btree ("featured_course_course_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "courses_page" DROP CONSTRAINT IF EXISTS "courses_page_featured_course_image_id_media_id_fk";
  `)
  await db.execute(sql`
    ALTER TABLE "courses_page" DROP CONSTRAINT IF EXISTS "courses_page_featured_course_course_id_courses_id_fk";
  `)
  await db.execute(sql`
    DROP INDEX IF EXISTS "courses_page_featured_course_image_idx";
  `)
  await db.execute(sql`
    DROP INDEX IF EXISTS "courses_page_featured_course_course_idx";
  `)
  await db.execute(sql`
    ALTER TABLE "courses_page"
      DROP COLUMN IF EXISTS "featured_course_enabled",
      DROP COLUMN IF EXISTS "featured_course_eyebrow",
      DROP COLUMN IF EXISTS "featured_course_heading",
      DROP COLUMN IF EXISTS "featured_course_body",
      DROP COLUMN IF EXISTS "featured_course_image_id",
      DROP COLUMN IF EXISTS "featured_course_badge",
      DROP COLUMN IF EXISTS "featured_course_button_label",
      DROP COLUMN IF EXISTS "featured_course_link_type",
      DROP COLUMN IF EXISTS "featured_course_course_id",
      DROP COLUMN IF EXISTS "featured_course_custom_url";
  `)
}
