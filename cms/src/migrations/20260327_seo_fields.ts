import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/**
 * Add SEO group fields (seo_title, seo_description, seo_og_image_id)
 * to every page global and to site_settings (for global defaults).
 *
 * Also adds social_share_image_id to courses for course-level OG images.
 *
 * All statements use IF NOT EXISTS / DO $$ ... END $$ so the migration
 * is safe to re-run and will not error on a partially-applied schema.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {

  // ── home_page ─────────────────────────────────────────────────────────────
  await db.execute(sql`
    ALTER TABLE "home_page"
      ADD COLUMN IF NOT EXISTS "seo_title" varchar(255),
      ADD COLUMN IF NOT EXISTS "seo_description" varchar(1000),
      ADD COLUMN IF NOT EXISTS "seo_og_image_id" integer;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "home_page"
        ADD CONSTRAINT "home_page_seo_og_image_id_media_id_fk"
        FOREIGN KEY ("seo_og_image_id") REFERENCES "media"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "home_page_seo_og_image_idx"
      ON "home_page" USING btree ("seo_og_image_id");
  `)

  // ── courses_page ──────────────────────────────────────────────────────────
  await db.execute(sql`
    ALTER TABLE "courses_page"
      ADD COLUMN IF NOT EXISTS "seo_title" varchar(255),
      ADD COLUMN IF NOT EXISTS "seo_description" varchar(1000),
      ADD COLUMN IF NOT EXISTS "seo_og_image_id" integer;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "courses_page"
        ADD CONSTRAINT "courses_page_seo_og_image_id_media_id_fk"
        FOREIGN KEY ("seo_og_image_id") REFERENCES "media"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "courses_page_seo_og_image_idx"
      ON "courses_page" USING btree ("seo_og_image_id");
  `)

  // ── applications_page ─────────────────────────────────────────────────────
  await db.execute(sql`
    ALTER TABLE "applications_page"
      ADD COLUMN IF NOT EXISTS "seo_title" varchar(255),
      ADD COLUMN IF NOT EXISTS "seo_description" varchar(1000),
      ADD COLUMN IF NOT EXISTS "seo_og_image_id" integer;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "applications_page"
        ADD CONSTRAINT "applications_page_seo_og_image_id_media_id_fk"
        FOREIGN KEY ("seo_og_image_id") REFERENCES "media"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "applications_page_seo_og_image_idx"
      ON "applications_page" USING btree ("seo_og_image_id");
  `)

  // ── store_page ────────────────────────────────────────────────────────────
  await db.execute(sql`
    ALTER TABLE "store_page"
      ADD COLUMN IF NOT EXISTS "seo_title" varchar(255),
      ADD COLUMN IF NOT EXISTS "seo_description" varchar(1000),
      ADD COLUMN IF NOT EXISTS "seo_og_image_id" integer;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "store_page"
        ADD CONSTRAINT "store_page_seo_og_image_id_media_id_fk"
        FOREIGN KEY ("seo_og_image_id") REFERENCES "media"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "store_page_seo_og_image_idx"
      ON "store_page" USING btree ("seo_og_image_id");
  `)

  // ── contact_settings ──────────────────────────────────────────────────────
  await db.execute(sql`
    ALTER TABLE "contact_settings"
      ADD COLUMN IF NOT EXISTS "seo_title" varchar(255),
      ADD COLUMN IF NOT EXISTS "seo_description" varchar(1000),
      ADD COLUMN IF NOT EXISTS "seo_og_image_id" integer;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "contact_settings"
        ADD CONSTRAINT "contact_settings_seo_og_image_id_media_id_fk"
        FOREIGN KEY ("seo_og_image_id") REFERENCES "media"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "contact_settings_seo_og_image_idx"
      ON "contact_settings" USING btree ("seo_og_image_id");
  `)

  // ── site_settings (global defaults) ──────────────────────────────────────
  await db.execute(sql`
    ALTER TABLE "site_settings"
      ADD COLUMN IF NOT EXISTS "seo_title" varchar(255),
      ADD COLUMN IF NOT EXISTS "seo_description" varchar(1000),
      ADD COLUMN IF NOT EXISTS "seo_og_image_id" integer;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "site_settings"
        ADD CONSTRAINT "site_settings_seo_og_image_id_media_id_fk"
        FOREIGN KEY ("seo_og_image_id") REFERENCES "media"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "site_settings_seo_og_image_idx"
      ON "site_settings" USING btree ("seo_og_image_id");
  `)

  // ── courses: per-course social share image ────────────────────────────────
  await db.execute(sql`
    ALTER TABLE "courses"
      ADD COLUMN IF NOT EXISTS "social_share_image_id" integer;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "courses"
        ADD CONSTRAINT "courses_social_share_image_id_media_id_fk"
        FOREIGN KEY ("social_share_image_id") REFERENCES "media"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "courses_social_share_image_idx"
      ON "courses" USING btree ("social_share_image_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // home_page
  await db.execute(sql`DROP INDEX IF EXISTS "home_page_seo_og_image_idx";`)
  await db.execute(sql`ALTER TABLE "home_page" DROP COLUMN IF EXISTS "seo_title", DROP COLUMN IF EXISTS "seo_description", DROP COLUMN IF EXISTS "seo_og_image_id";`)
  // courses_page
  await db.execute(sql`DROP INDEX IF EXISTS "courses_page_seo_og_image_idx";`)
  await db.execute(sql`ALTER TABLE "courses_page" DROP COLUMN IF EXISTS "seo_title", DROP COLUMN IF EXISTS "seo_description", DROP COLUMN IF EXISTS "seo_og_image_id";`)
  // applications_page
  await db.execute(sql`DROP INDEX IF EXISTS "applications_page_seo_og_image_idx";`)
  await db.execute(sql`ALTER TABLE "applications_page" DROP COLUMN IF EXISTS "seo_title", DROP COLUMN IF EXISTS "seo_description", DROP COLUMN IF EXISTS "seo_og_image_id";`)
  // store_page
  await db.execute(sql`DROP INDEX IF EXISTS "store_page_seo_og_image_idx";`)
  await db.execute(sql`ALTER TABLE "store_page" DROP COLUMN IF EXISTS "seo_title", DROP COLUMN IF EXISTS "seo_description", DROP COLUMN IF EXISTS "seo_og_image_id";`)
  // contact_settings
  await db.execute(sql`DROP INDEX IF EXISTS "contact_settings_seo_og_image_idx";`)
  await db.execute(sql`ALTER TABLE "contact_settings" DROP COLUMN IF EXISTS "seo_title", DROP COLUMN IF EXISTS "seo_description", DROP COLUMN IF EXISTS "seo_og_image_id";`)
  // site_settings
  await db.execute(sql`DROP INDEX IF EXISTS "site_settings_seo_og_image_idx";`)
  await db.execute(sql`ALTER TABLE "site_settings" DROP COLUMN IF EXISTS "seo_title", DROP COLUMN IF EXISTS "seo_description", DROP COLUMN IF EXISTS "seo_og_image_id";`)
  // courses
  await db.execute(sql`DROP INDEX IF EXISTS "courses_social_share_image_idx";`)
  await db.execute(sql`ALTER TABLE "courses" DROP COLUMN IF EXISTS "social_share_image_id";`)
}
