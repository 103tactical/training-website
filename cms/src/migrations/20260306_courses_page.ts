import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "courses_page" (
      "id" serial PRIMARY KEY NOT NULL,
      "hero_image_id" integer,
      "header_title" varchar,
      "header_subtext" varchar,
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );

    CREATE TABLE IF NOT EXISTS "courses_page_course_groups" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "group_id" integer
    );

    ALTER TABLE "courses_page"
      ADD CONSTRAINT "courses_page_hero_image_id_media_id_fk"
        FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;

    ALTER TABLE "courses_page_course_groups"
      ADD CONSTRAINT "courses_page_course_groups_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."courses_page"("id")
        ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "courses_page_course_groups"
      ADD CONSTRAINT "courses_page_course_groups_group_id_course_groups_id_fk"
        FOREIGN KEY ("group_id") REFERENCES "public"."course_groups"("id")
        ON DELETE set null ON UPDATE no action;

    CREATE INDEX IF NOT EXISTS "courses_page_hero_image_idx"
      ON "courses_page" USING btree ("hero_image_id");
    CREATE INDEX IF NOT EXISTS "courses_page_course_groups_order_idx"
      ON "courses_page_course_groups" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "courses_page_course_groups_parent_id_idx"
      ON "courses_page_course_groups" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "courses_page_course_groups_group_idx"
      ON "courses_page_course_groups" USING btree ("group_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "courses_page_course_groups";
    DROP TABLE IF EXISTS "courses_page";
  `)
}
