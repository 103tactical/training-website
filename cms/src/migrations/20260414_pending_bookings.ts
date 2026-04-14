import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Creates the pending_bookings table.
 *
 * A pending booking is a short-lived record created when a visitor submits the
 * booking form on the website.  It holds the visitor's form data and serves as
 * the bridge between form submission and Square payment confirmation.
 *
 * Lifecycle:
 *   pending   → visitor clicked "Proceed to Payment", Square link generated
 *   completed → webhook received payment.updated, Attendee + Booking created
 *   failed    → webhook fired but Booking creation errored (retry available)
 *   expired   → visitor never paid; older than 24 h (set by cleanup job)
 *
 * The `token` column is embedded in the Square Order's referenceId so the
 * webhook handler can look up the pending booking after payment completes.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // ── 1. Create the table ────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "pending_bookings" (
      "id"                   serial PRIMARY KEY,
      "token"                varchar(32)   NOT NULL,
      "course_schedule_id"   integer       REFERENCES "course_schedules"("id") ON DELETE SET NULL,
      "email"                varchar(255)  NOT NULL,
      "first_name"           varchar(100),
      "last_name"            varchar(100),
      "phone"                varchar(30),
      "status"               varchar(50)   NOT NULL DEFAULT 'pending',
      "square_order_id"      varchar(255),
      "square_payment_id"    varchar(255),
      "amount_paid_cents"    integer,
      "failure_reason"       text,
      "attempted_at"         timestamp(3) with time zone,
      "updated_at"           timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"           timestamp(3) with time zone DEFAULT now() NOT NULL
    )
  `)

  // ── 2. Indexes ─────────────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "pending_bookings_token_idx"
      ON "pending_bookings" ("token")
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "pending_bookings_status_idx"
      ON "pending_bookings" ("status")
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "pending_bookings_email_idx"
      ON "pending_bookings" ("email")
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "pending_bookings_schedule_idx"
      ON "pending_bookings" ("course_schedule_id")
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "pending_bookings_created_at_idx"
      ON "pending_bookings" ("created_at")
  `)

  // ── 3. Register in payload_locked_documents_rels ───────────────────────────
  // Payload uses this join table to prevent concurrent admin edits on a document.
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "pending_bookings_id" integer
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_pending_bookings_fk"
          FOREIGN KEY ("pending_bookings_id")
          REFERENCES "public"."pending_bookings"("id")
          ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_pending_bookings_id_idx"
      ON "payload_locked_documents_rels" USING btree ("pending_bookings_id")
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Remove from payload_locked_documents_rels
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        DROP CONSTRAINT "payload_locked_documents_rels_pending_bookings_fk";
    EXCEPTION WHEN undefined_object THEN null;
    END $$
  `)
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "pending_bookings_id"
  `)

  // Drop the table
  await db.execute(sql`DROP TABLE IF EXISTS "pending_bookings" CASCADE`)
}
