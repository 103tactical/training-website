import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "utility" (
      "id"              serial PRIMARY KEY,
      "carousel_delay"  varchar DEFAULT '6',
      "updated_at"      timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"      timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "utility";
  `)
}
