import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // 1. Main schedule slots table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "course_schedules" (
      "id"           serial PRIMARY KEY,
      "course_id"    integer REFERENCES "courses"("id") ON DELETE SET NULL,
      "label"        varchar(255),
      "max_seats"    numeric NOT NULL,
      "seats_booked" numeric DEFAULT 0,
      "is_active"    boolean DEFAULT true,
      "updated_at"   timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"   timestamp(3) with time zone DEFAULT now() NOT NULL
    )
  `)

  // 2. Sessions array table (one row per day within a slot)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "course_schedules_sessions" (
      "_order"     integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "course_schedules"("id") ON DELETE CASCADE,
      "id"         varchar PRIMARY KEY,
      "date"       timestamp(3) with time zone,
      "start_time" timestamp(3) with time zone,
      "end_time"   timestamp(3) with time zone
    )
  `)

  // 3. Indexes
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "course_schedules_sessions_order_idx"
      ON "course_schedules_sessions" ("_order")
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "course_schedules_sessions_parent_idx"
      ON "course_schedules_sessions" ("_parent_id")
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "course_schedules_course_idx"
      ON "course_schedules" ("course_id")
  `)

  // 4. Add course_schedules_id to payload_locked_documents_rels
  //    (required by Payload for every collection — without this the admin crashes)
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "course_schedules_id" integer
  `)
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_course_schedules_fk"
        FOREIGN KEY ("course_schedules_id") REFERENCES "public"."course_schedules"("id")
        ON DELETE cascade ON UPDATE no action
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_course_schedules_id_idx"
      ON "payload_locked_documents_rels" USING btree ("course_schedules_id")
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_course_schedules_fk"
  `)
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "course_schedules_id"
  `)
  await db.execute(sql`DROP TABLE IF EXISTS "course_schedules_sessions"`)
  await db.execute(sql`DROP TABLE IF EXISTS "course_schedules"`)
}
