import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds a source marker to pending_bookings distinguishing admin-sent payment
 * links ('admin-link') from website checkouts ('website'). Outstanding
 * admin-link pendings HOLD a seat in the website's availability math —
 * website checkout pendings (mostly abandoners) hold nothing.
 * Null (legacy rows) is treated as 'website'.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "pending_bookings" ADD COLUMN IF NOT EXISTS "source" varchar(20);
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "pending_bookings_source_idx"
      ON "pending_bookings" ("source")
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "pending_bookings" DROP COLUMN IF EXISTS "source";
  `)
}
