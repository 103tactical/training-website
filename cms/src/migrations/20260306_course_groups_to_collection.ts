import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- Drop old global-based tables
    DROP TABLE IF EXISTS "course_groups_groups_courses";
    DROP TABLE IF EXISTS "course_groups_groups";
    DROP TABLE IF EXISTS "course_groups";

    -- Create course_groups as a proper collection
    CREATE TABLE "course_groups" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    -- Courses array within a group
    CREATE TABLE "course_groups_courses" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "course_id" integer
    );

    ALTER TABLE "course_groups_courses"
      ADD CONSTRAINT "course_groups_courses_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."course_groups"("id")
        ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "course_groups_courses"
      ADD CONSTRAINT "course_groups_courses_course_id_courses_id_fk"
        FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id")
        ON DELETE set null ON UPDATE no action;

    CREATE INDEX "course_groups_updated_at_idx" ON "course_groups" USING btree ("updated_at");
    CREATE INDEX "course_groups_created_at_idx" ON "course_groups" USING btree ("created_at");
    CREATE INDEX "course_groups_courses_order_idx" ON "course_groups_courses" USING btree ("_order");
    CREATE INDEX "course_groups_courses_parent_id_idx" ON "course_groups_courses" USING btree ("_parent_id");
    CREATE INDEX "course_groups_courses_course_idx" ON "course_groups_courses" USING btree ("course_id");

    -- Replace featuredCoursesSection on home_page with a direct FK to course_groups
    ALTER TABLE "home_page"
      DROP COLUMN IF EXISTS "featured_courses_section_heading";

    DELETE FROM "home_page_rels"
      WHERE "path" = 'featuredCoursesSection.courses';

    ALTER TABLE "home_page"
      ADD COLUMN IF NOT EXISTS "featured_course_group_id" integer;

    ALTER TABLE "home_page"
      ADD CONSTRAINT "home_page_featured_course_group_id_course_groups_id_fk"
        FOREIGN KEY ("featured_course_group_id") REFERENCES "public"."course_groups"("id")
        ON DELETE set null ON UPDATE no action;

    CREATE INDEX IF NOT EXISTS "home_page_featured_course_group_idx"
      ON "home_page" USING btree ("featured_course_group_id");

    -- Allow payload_locked_documents_rels to reference course_groups
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "course_groups_id" integer;

    ALTER TABLE "payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_course_groups_fk"
        FOREIGN KEY ("course_groups_id") REFERENCES "public"."course_groups"("id")
        ON DELETE cascade ON UPDATE no action;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_course_groups_fk";
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "course_groups_id";

    ALTER TABLE "home_page"
      DROP CONSTRAINT IF EXISTS "home_page_featured_course_group_id_course_groups_id_fk";
    DROP INDEX IF EXISTS "home_page_featured_course_group_idx";
    ALTER TABLE "home_page"
      DROP COLUMN IF EXISTS "featured_course_group_id";
    ALTER TABLE "home_page"
      ADD COLUMN IF NOT EXISTS "featured_courses_section_heading" varchar DEFAULT 'Our Courses';

    DROP TABLE IF EXISTS "course_groups_courses";
    DROP TABLE IF EXISTS "course_groups";
  `)
}
