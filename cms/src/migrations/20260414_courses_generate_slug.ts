import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/**
 * Add generate_slug boolean column to courses table.
 * Required by Payload's built-in slugField helper which stores a checkbox
 * (generateSlug) alongside the slug field to control auto-generation.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "courses"
      ADD COLUMN IF NOT EXISTS "generate_slug" boolean DEFAULT true;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "courses"
      DROP COLUMN IF EXISTS "generate_slug";
  `)
}
