import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "home_page"
      RENAME COLUMN "featured_courses_heading" TO "featured_courses_section_heading";

    UPDATE "home_page_rels"
      SET "path" = 'featuredCoursesSection.courses'
      WHERE "path" = 'featuredCourses';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "home_page"
      RENAME COLUMN "featured_courses_section_heading" TO "featured_courses_heading";

    UPDATE "home_page_rels"
      SET "path" = 'featuredCourses'
      WHERE "path" = 'featuredCoursesSection.courses';
  `)
}
