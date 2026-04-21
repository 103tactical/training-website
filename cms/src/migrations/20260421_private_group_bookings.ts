import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Creates the private_group_bookings table and its two array child tables.
 *
 * This collection is a management/staging record used by admins to set up
 * a private course booking for a group.  It holds the group title, linked
 * course, price, session dates, attendee list, onboarding message, and
 * payment direction (Square links or manual).
 *
 * When the admin clicks "Process", the handler creates records in the
 * existing course_schedules, attendees, bookings, and pending_bookings
 * tables — the same tables used by all other bookings on the platform.
 *
 * Child tables:
 *   private_group_bookings_sessions  — one row per session day
 *   private_group_bookings_attendees — one row per attendee in the group
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // ── 1. Main table ──────────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "private_group_bookings" (
      "id"                    serial PRIMARY KEY,
      "title"                 varchar(255)  NOT NULL,
      "status"                varchar(50)   NOT NULL DEFAULT 'draft',
      "course_id"             integer       REFERENCES "courses"("id") ON DELETE SET NULL,
      "price_per_seat"        numeric,
      "internal_notes"        text,
      "onboarding_message"    text,
      "payment_method"        varchar(50),
      "manual_payment_note"   varchar(255),
      "created_schedule_id"   integer,
      "updated_at"            timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"            timestamp(3) with time zone DEFAULT now() NOT NULL
    )
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "private_group_bookings_status_idx"
      ON "private_group_bookings" ("status")
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "private_group_bookings_created_at_idx"
      ON "private_group_bookings" ("created_at")
  `)

  // ── 2. Sessions array table ────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "private_group_bookings_sessions" (
      "_order"      integer     NOT NULL,
      "_parent_id"  integer     NOT NULL REFERENCES "private_group_bookings"("id") ON DELETE CASCADE,
      "id"          varchar     PRIMARY KEY,
      "date"        timestamp(3) with time zone,
      "start_time"  timestamp(3) with time zone,
      "end_time"    timestamp(3) with time zone
    )
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "private_group_bookings_sessions_order_idx"
      ON "private_group_bookings_sessions" ("_order")
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "private_group_bookings_sessions_parent_idx"
      ON "private_group_bookings_sessions" ("_parent_id")
  `)

  // ── 3. Attendees array table ───────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "private_group_bookings_attendees" (
      "_order"          integer     NOT NULL,
      "_parent_id"      integer     NOT NULL REFERENCES "private_group_bookings"("id") ON DELETE CASCADE,
      "id"              varchar     PRIMARY KEY,
      "first_name"      varchar(100) NOT NULL,
      "last_name"       varchar(100) NOT NULL,
      "email"           varchar(255) NOT NULL,
      "phone"           varchar(50),
      "payment_status"  varchar(50)  DEFAULT 'pending',
      "booking_id"      integer,
      "payment_link"    text
    )
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "private_group_bookings_attendees_order_idx"
      ON "private_group_bookings_attendees" ("_order")
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "private_group_bookings_attendees_parent_idx"
      ON "private_group_bookings_attendees" ("_parent_id")
  `)

  // ── 4. Register in payload_locked_documents_rels ───────────────────────────
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "private_group_bookings_id" integer
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_private_group_bookings_fk"
          FOREIGN KEY ("private_group_bookings_id")
          REFERENCES "public"."private_group_bookings"("id")
          ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_private_group_bookings_id_idx"
      ON "payload_locked_documents_rels" USING btree ("private_group_bookings_id")
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        DROP CONSTRAINT "payload_locked_documents_rels_private_group_bookings_fk";
    EXCEPTION WHEN undefined_object THEN null;
    END $$
  `)
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "private_group_bookings_id"
  `)
  await db.execute(sql`DROP TABLE IF EXISTS "private_group_bookings_attendees" CASCADE`)
  await db.execute(sql`DROP TABLE IF EXISTS "private_group_bookings_sessions" CASCADE`)
  await db.execute(sql`DROP TABLE IF EXISTS "private_group_bookings" CASCADE`)
}
