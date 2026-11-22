import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Removes the unused `status` column from contact_submissions.
 *
 * The new/read status FIELD was removed from the collection on 2026-08-08
 * (commit 7556368) when dashboard Notifications took over the "needs
 * attention" role. The column was left behind for rollback safety and has
 * not been read or written by any code since — every row created after that
 * date simply carries the column default ('new').
 *
 * Idempotent (IF EXISTS / IF NOT EXISTS). The column had no index, constraint,
 * trigger or view depending on it; its only dependent was its own default.
 * `down` restores the column exactly as it was defined in
 * 20260305_contact_submissions_topic_status (varchar, nullable, default 'new').
 * The pre-drop values are preserved in the 2026-11-22 database backup.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "contact_submissions" DROP COLUMN IF EXISTS "status";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "contact_submissions" ADD COLUMN IF NOT EXISTS "status" varchar DEFAULT 'new';
  `)
}
