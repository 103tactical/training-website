import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * CMS-editable copy for the booking page's card-fee notice (heading + body).
 * Empty values fall back to the previous hardcoded copy in the website, so
 * nothing changes until an admin edits the fields. The body supports a
 * {percent} placeholder filled with the configured surcharge percentage.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "e_commerce" ADD COLUMN IF NOT EXISTS "payments_surcharge_notice_heading" varchar;
  `)
  await db.execute(sql`
    ALTER TABLE "e_commerce" ADD COLUMN IF NOT EXISTS "payments_surcharge_notice_body" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "e_commerce" DROP COLUMN IF EXISTS "payments_surcharge_notice_heading";
  `)
  await db.execute(sql`
    ALTER TABLE "e_commerce" DROP COLUMN IF EXISTS "payments_surcharge_notice_body";
  `)
}
