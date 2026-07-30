import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Per-course SEO meta description. Course detail pages are the strongest
 * SEO targets on the site (the old WordPress domain's CCW pages 301 to
 * them), and previously rendered no meta description at all. The website
 * falls back to the course's bullet summary when this is empty.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "seo_description" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "courses" DROP COLUMN IF EXISTS "seo_description";
  `)
}
