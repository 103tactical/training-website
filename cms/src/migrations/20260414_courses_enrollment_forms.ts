import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds Enrollment Forms fields to the courses table.
 *
 * - enrollment_message : Admin-authored text sent to the attendee on booking confirmation.
 * - enrollment_file_id : FK to media — the PDF document attached to the enrollment email.
 *
 * Both columns are nullable; courses without an enrollment form are unaffected.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "courses"
      ADD COLUMN IF NOT EXISTS "enrollment_message" varchar,
      ADD COLUMN IF NOT EXISTS "enrollment_file_id" integer
        REFERENCES "media"("id") ON DELETE SET NULL
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "courses"
      DROP COLUMN IF EXISTS "enrollment_message",
      DROP COLUMN IF EXISTS "enrollment_file_id"
  `)
}
