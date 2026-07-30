import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * "Show on Website" flag for discount codes. Flagged codes are advertised
 * publicly: eligible course prices display crossed out with the discounted
 * price + code, and the booking page auto-applies the code. Defaults false —
 * existing and future codes stay private unless deliberately flagged.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "discount_codes" ADD COLUMN IF NOT EXISTS "show_on_site" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "discount_codes" DROP COLUMN IF EXISTS "show_on_site";
  `)
}
