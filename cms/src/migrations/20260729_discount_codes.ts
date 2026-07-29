import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Creates the discount_codes table and its relationship table.
 *
 * Discount codes are applied on the website booking form (and the CMS
 * "Send Payment Link" tool). The discount comes off the course price; the
 * card surcharge is then computed on the discounted amount. Redemptions are
 * counted by the payment webhook on successful payment.
 *
 * discount_codes_rels holds the hasMany "courses" relationship used when a
 * code is scoped to specific courses (applies_to = 'specific').
 *
 * Select fields use varchar (not postgres enums) — the same pattern as
 * pending_bookings.status, proven in production with this adapter.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // ── 1. Main table ──────────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "discount_codes" (
      "id"                serial PRIMARY KEY,
      "code"              varchar(32)   NOT NULL,
      "active"            boolean       DEFAULT true,
      "discount_type"     varchar(20)   NOT NULL DEFAULT 'percent',
      "percent_off"       numeric,
      "amount_off_cents"  numeric,
      "applies_to"        varchar(20)   NOT NULL DEFAULT 'all',
      "expires_at"        timestamp(3) with time zone,
      "max_redemptions"   numeric,
      "times_redeemed"    numeric       DEFAULT 0,
      "notes"             text,
      "updated_at"        timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"        timestamp(3) with time zone DEFAULT now() NOT NULL
    )
  `)

  // ── 2. Indexes ─────────────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "discount_codes_code_idx"
      ON "discount_codes" ("code")
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "discount_codes_updated_at_idx"
      ON "discount_codes" ("updated_at")
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "discount_codes_created_at_idx"
      ON "discount_codes" ("created_at")
  `)

  // ── 3. Relationship table (hasMany courses scope) ──────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "discount_codes_rels" (
      "id"          serial PRIMARY KEY,
      "order"       integer,
      "parent_id"   integer NOT NULL,
      "path"        varchar NOT NULL,
      "courses_id"  integer
    )
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "discount_codes_rels"
        ADD CONSTRAINT "discount_codes_rels_parent_fk"
          FOREIGN KEY ("parent_id")
          REFERENCES "public"."discount_codes"("id")
          ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "discount_codes_rels"
        ADD CONSTRAINT "discount_codes_rels_courses_fk"
          FOREIGN KEY ("courses_id")
          REFERENCES "public"."courses"("id")
          ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "discount_codes_rels_order_idx"
      ON "discount_codes_rels" USING btree ("order")
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "discount_codes_rels_parent_idx"
      ON "discount_codes_rels" USING btree ("parent_id")
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "discount_codes_rels_path_idx"
      ON "discount_codes_rels" USING btree ("path")
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "discount_codes_rels_courses_id_idx"
      ON "discount_codes_rels" USING btree ("courses_id")
  `)

  // ── 4. Register in payload_locked_documents_rels ───────────────────────────
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "discount_codes_id" integer
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_discount_codes_fk"
          FOREIGN KEY ("discount_codes_id")
          REFERENCES "public"."discount_codes"("id")
          ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_discount_codes_id_idx"
      ON "payload_locked_documents_rels" USING btree ("discount_codes_id")
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        DROP CONSTRAINT "payload_locked_documents_rels_discount_codes_fk";
    EXCEPTION WHEN undefined_object THEN null;
    END $$
  `)
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "discount_codes_id"
  `)
  await db.execute(sql`DROP TABLE IF EXISTS "discount_codes_rels" CASCADE`)
  await db.execute(sql`DROP TABLE IF EXISTS "discount_codes" CASCADE`)
}
