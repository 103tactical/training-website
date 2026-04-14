import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Splits the old monolithic `attendees` table into two:
 *   - `attendees`  — person-level (name, email, phone)
 *   - `bookings`   — booking-level (attendee FK, course, schedule, status, payment, notes)
 *
 * All existing attendee rows are test data and are intentionally discarded.
 * course_schedules.seats_booked is reset to 0 accordingly.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {

  // ── 1. Null-out attendees_id references so we can safely drop + recreate the table ──
  await db.execute(sql`
    UPDATE "payload_locked_documents_rels" SET "attendees_id" = NULL
  `)

  // ── 2. Drop FK constraint that references old attendees table ─────────────────────
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        DROP CONSTRAINT "payload_locked_documents_rels_attendees_fk";
    EXCEPTION WHEN undefined_object THEN null;
    END $$
  `)

  // ── 3. Drop old attendees table (test data — intentionally discarded) ─────────────
  await db.execute(sql`DROP TABLE IF EXISTS "attendees" CASCADE`)

  // ── 4. Reset seats_booked on all course schedules (no real bookings existed) ───────
  await db.execute(sql`UPDATE "course_schedules" SET "seats_booked" = 0`)

  // ── 5. Create new person-level attendees table ────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE "attendees" (
      "id"          serial PRIMARY KEY,
      "first_name"  varchar(255) NOT NULL,
      "last_name"   varchar(255) NOT NULL,
      "email"       varchar(255) NOT NULL,
      "phone"       varchar(255),
      "updated_at"  timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"  timestamp(3) with time zone DEFAULT now() NOT NULL
    )
  `)

  // ── 6. Re-add FK from payload_locked_documents_rels.attendees_id → new attendees ──
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_attendees_fk"
          FOREIGN KEY ("attendees_id") REFERENCES "public"."attendees"("id")
          ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `)

  // ── 7. Create bookings table ──────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE "bookings" (
      "id"                  serial PRIMARY KEY,
      "admin_title"         varchar(255),
      "attendee_id"         integer NOT NULL REFERENCES "attendees"("id") ON DELETE CASCADE,
      "course_id"           integer REFERENCES "courses"("id") ON DELETE SET NULL,
      "course_schedule_id"  integer REFERENCES "course_schedules"("id") ON DELETE SET NULL,
      "status"              varchar(50) NOT NULL DEFAULT 'confirmed',
      "payment_reference"   varchar(255),
      "notes"               text,
      "updated_at"          timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"          timestamp(3) with time zone DEFAULT now() NOT NULL
    )
  `)

  // ── 8. Indexes on bookings ────────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "bookings_attendee_idx"  ON "bookings" ("attendee_id")
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "bookings_course_idx"    ON "bookings" ("course_id")
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "bookings_schedule_idx"  ON "bookings" ("course_schedule_id")
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "bookings_status_idx"    ON "bookings" ("status")
  `)

  // ── 9. Register bookings in payload_locked_documents_rels ─────────────────────────
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "bookings_id" integer
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_bookings_fk"
          FOREIGN KEY ("bookings_id") REFERENCES "public"."bookings"("id")
          ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_bookings_id_idx"
      ON "payload_locked_documents_rels" USING btree ("bookings_id")
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // ── Remove bookings infrastructure ────────────────────────────────────────────────
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        DROP CONSTRAINT "payload_locked_documents_rels_bookings_fk";
    EXCEPTION WHEN undefined_object THEN null;
    END $$
  `)
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "bookings_id"
  `)
  await db.execute(sql`DROP TABLE IF EXISTS "bookings" CASCADE`)

  // ── Remove new attendees table ────────────────────────────────────────────────────
  await db.execute(sql`
    UPDATE "payload_locked_documents_rels" SET "attendees_id" = NULL
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        DROP CONSTRAINT "payload_locked_documents_rels_attendees_fk";
    EXCEPTION WHEN undefined_object THEN null;
    END $$
  `)
  await db.execute(sql`DROP TABLE IF EXISTS "attendees" CASCADE`)

  // ── Restore original monolithic attendees table ───────────────────────────────────
  await db.execute(sql`
    CREATE TABLE "attendees" (
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
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_attendees_fk"
          FOREIGN KEY ("attendees_id") REFERENCES "public"."attendees"("id")
          ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `)
}
