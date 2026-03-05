import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "contact_submissions"
      ADD COLUMN IF NOT EXISTS "topic"  varchar;

    ALTER TABLE "contact_submissions"
      ADD COLUMN IF NOT EXISTS "status" varchar DEFAULT 'new';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "contact_submissions"
      DROP COLUMN IF EXISTS "topic";

    ALTER TABLE "contact_submissions"
      DROP COLUMN IF EXISTS "status";
  `)
}
