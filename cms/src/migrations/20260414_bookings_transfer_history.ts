import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds the bookings_transfer_history array table.
 * Payload stores array fields in a dedicated child table keyed by _parent_id.
 * Each row represents one transfer event on a booking.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "bookings_transfer_history" (
      "_order"          integer NOT NULL,
      "_parent_id"      integer NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
      "id"              varchar PRIMARY KEY,
      "from_session"    varchar(255),
      "to_session"      varchar(255),
      "transferred_at"  timestamp(3) with time zone
    )
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "bookings_transfer_history_order_idx"
      ON "bookings_transfer_history" ("_order")
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "bookings_transfer_history_parent_idx"
      ON "bookings_transfer_history" ("_parent_id")
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "bookings_transfer_history"`)
}
