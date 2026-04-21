import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "home_page"
    SET "testimonials_section_heading" = 'What Our Attendees Are Saying';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "home_page"
    SET "testimonials_section_heading" = 'What Attendees Are Saying';
  `)
}
