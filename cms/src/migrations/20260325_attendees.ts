import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // 1. Attendees table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "attendees" (
      "id"                  serial PRIMARY KEY,
      "first_name"          varchar(255) NOT NULL,
      "last_name"           varchar(255) NOT NULL,
      "email"               varchar(255) NOT NULL,
      "phone"               varchar(255),
      "course_id"           integer REFERENCES "courses"("id") ON DELETE SET NULL,
      "course_schedule_id"  integer REFERENCES "course_schedules"("id") ON DELETE SET NULL,
      "status"              varchar(50) NOT NULL DEFAULT 'confirmed',
      "payment_reference"   varchar(255),
      "notes"               text,
      "updated_at"          timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"          timestamp(3) with time zone DEFAULT now() NOT NULL
    )
  `)

  // 2. Indexes for fast roster lookups
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "attendees_course_idx"
      ON "attendees" ("course_id")
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "attendees_schedule_idx"
      ON "attendees" ("course_schedule_id")
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "attendees_status_idx"
      ON "attendees" ("status")
  `)

  // 3. Add attendees_id to payload_locked_documents_rels
  //    Required by Payload for every registered collection — without this the admin crashes
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "attendees_id" integer
  `)
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_attendees_fk"
        FOREIGN KEY ("attendees_id") REFERENCES "public"."attendees"("id")
        ON DELETE cascade ON UPDATE no action
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_attendees_id_idx"
      ON "payload_locked_documents_rels" USING btree ("attendees_id")
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_attendees_fk"
  `)
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "attendees_id"
  `)
  await db.execute(sql`DROP TABLE IF EXISTS "attendees"`)
}
