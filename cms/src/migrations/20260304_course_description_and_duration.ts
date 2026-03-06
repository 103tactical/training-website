import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "courses"
      ADD COLUMN IF NOT EXISTS "description" jsonb,
      ADD COLUMN IF NOT EXISTS "duration_hours" numeric,
      ADD COLUMN IF NOT EXISTS "duration_days" numeric;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "courses"
      DROP COLUMN IF EXISTS "description",
      DROP COLUMN IF EXISTS "duration_hours",
      DROP COLUMN IF EXISTS "duration_days";
  `)
}
