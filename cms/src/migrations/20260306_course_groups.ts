import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "course_groups" (
      "id" serial PRIMARY KEY NOT NULL,
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );

    CREATE TABLE IF NOT EXISTS "course_groups_groups" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "course_groups_groups_courses" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "course_id" integer
    );

    ALTER TABLE "course_groups_groups"
      ADD CONSTRAINT "course_groups_groups_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."course_groups"("id")
        ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "course_groups_groups_courses"
      ADD CONSTRAINT "course_groups_groups_courses_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."course_groups_groups"("id")
        ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "course_groups_groups_courses"
      ADD CONSTRAINT "course_groups_groups_courses_course_id_courses_id_fk"
        FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id")
        ON DELETE set null ON UPDATE no action;

    CREATE INDEX IF NOT EXISTS "course_groups_groups_order_idx"
      ON "course_groups_groups" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "course_groups_groups_parent_id_idx"
      ON "course_groups_groups" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "course_groups_groups_courses_order_idx"
      ON "course_groups_groups_courses" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "course_groups_groups_courses_parent_id_idx"
      ON "course_groups_groups_courses" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "course_groups_groups_courses_course_idx"
      ON "course_groups_groups_courses" USING btree ("course_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "course_groups_groups_courses";
    DROP TABLE IF EXISTS "course_groups_groups";
    DROP TABLE IF EXISTS "course_groups";
  `)
}
