import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // 1. Add the computed title column
  await db.execute(sql`
    ALTER TABLE "course_schedules"
      ADD COLUMN IF NOT EXISTS "admin_title" varchar(500)
  `)

  // 2. Backfill existing records: "Course Name: Internal Label"
  await db.execute(sql`
    UPDATE "course_schedules" cs
    SET "admin_title" = c.title || ': ' || COALESCE(cs.label, '')
    FROM "courses" c
    WHERE cs.course_id = c.id
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "course_schedules" DROP COLUMN IF EXISTS "admin_title"
  `)
}
