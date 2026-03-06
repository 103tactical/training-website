import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- websiteHeadline → websiteHeadlineSection.headline
    ALTER TABLE "home_page"
      RENAME COLUMN "website_headline" TO "website_headline_section_headline";

    -- featuredCourseGroup → featuredCoursesSection.courseGroup
    ALTER TABLE "home_page"
      RENAME COLUMN "featured_course_group_id" TO "featured_courses_section_course_group_id";

    ALTER TABLE "home_page"
      RENAME CONSTRAINT "home_page_featured_course_group_id_course_groups_id_fk"
      TO "home_page_featured_courses_section_course_group_id_course_groups_id_fk";

    DROP INDEX IF EXISTS "home_page_featured_course_group_idx";
    CREATE INDEX "home_page_featured_courses_section_course_group_idx"
      ON "home_page" USING btree ("featured_courses_section_course_group_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "home_page_featured_courses_section_course_group_idx";
    CREATE INDEX "home_page_featured_course_group_idx"
      ON "home_page" USING btree ("featured_course_group_id");

    ALTER TABLE "home_page"
      RENAME CONSTRAINT "home_page_featured_courses_section_course_group_id_course_groups_id_fk"
      TO "home_page_featured_course_group_id_course_groups_id_fk";

    ALTER TABLE "home_page"
      RENAME COLUMN "featured_courses_section_course_group_id" TO "featured_course_group_id";

    ALTER TABLE "home_page"
      RENAME COLUMN "website_headline_section_headline" TO "website_headline";
  `)
}
