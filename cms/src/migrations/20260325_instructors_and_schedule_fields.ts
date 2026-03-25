import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // 1. Instructors table — must exist before we add the FK on course_schedules
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "instructors" (
      "id"          serial PRIMARY KEY,
      "name"        varchar(255) NOT NULL,
      "title"       varchar(255),
      "photo_id"    integer REFERENCES "media"("id") ON DELETE SET NULL,
      "updated_at"  timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"  timestamp(3) with time zone DEFAULT now() NOT NULL
    )
  `)

  // 2. display_label on course_schedules (visitor-facing session name)
  await db.execute(sql`
    ALTER TABLE "course_schedules"
      ADD COLUMN IF NOT EXISTS "display_label" varchar(255)
  `)

  // 3. instructor_id on course_schedules (FK to instructors)
  await db.execute(sql`
    ALTER TABLE "course_schedules"
      ADD COLUMN IF NOT EXISTS "instructor_id" integer
        REFERENCES "instructors"("id") ON DELETE SET NULL
  `)

  // 4. Index on instructor_id for fast lookups
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "course_schedules_instructor_idx"
      ON "course_schedules" ("instructor_id")
  `)

  // 5. Add instructors_id to payload_locked_documents_rels
  //    Required by Payload for every registered collection
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "instructors_id" integer
  `)
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_instructors_fk"
        FOREIGN KEY ("instructors_id") REFERENCES "public"."instructors"("id")
        ON DELETE cascade ON UPDATE no action
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_instructors_id_idx"
      ON "payload_locked_documents_rels" USING btree ("instructors_id")
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_instructors_fk"
  `)
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "instructors_id"
  `)
  await db.execute(sql`
    ALTER TABLE "course_schedules" DROP COLUMN IF EXISTS "instructor_id"
  `)
  await db.execute(sql`
    ALTER TABLE "course_schedules" DROP COLUMN IF EXISTS "display_label"
  `)
  await db.execute(sql`DROP TABLE IF EXISTS "instructors"`)
}
