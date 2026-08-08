import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Creates the notifications table — dismissable "needs your attention"
 * reminders shown on the admin dashboard and the Notifications page.
 *
 * Rows are created by the website (contact form received, paid-but-
 * waitlisted, booking-creation failure) via the CMS_WRITE_SECRET bearer.
 * No relationships — plain text/boolean columns only, so no _rels table.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "notifications" (
      "id"            serial PRIMARY KEY,
      "what_happened" varchar(500) NOT NULL,
      "what_to_do"    varchar(500) NOT NULL,
      "link"          varchar(300),
      "link_label"    varchar(100),
      "dismissed"     boolean DEFAULT false,
      "updated_at"    timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"    timestamp(3) with time zone DEFAULT now() NOT NULL
    )
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "notifications_updated_at_idx"
      ON "notifications" ("updated_at")
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "notifications_created_at_idx"
      ON "notifications" ("created_at")
  `)

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "notifications_id" integer
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_notifications_fk"
          FOREIGN KEY ("notifications_id")
          REFERENCES "public"."notifications"("id")
          ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_notifications_id_idx"
      ON "payload_locked_documents_rels" USING btree ("notifications_id")
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        DROP CONSTRAINT "payload_locked_documents_rels_notifications_fk";
    EXCEPTION WHEN undefined_object THEN null;
    END $$
  `)
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "notifications_id"
  `)
  await db.execute(sql`DROP TABLE IF EXISTS "notifications" CASCADE`)
}
