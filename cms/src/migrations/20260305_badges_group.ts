import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "home_page"
      RENAME COLUMN "badges_heading" TO "badges_section_heading";

    UPDATE "home_page_rels"
      SET "path" = 'badgesSection.badges'
      WHERE "path" = 'badges';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "home_page"
      RENAME COLUMN "badges_section_heading" TO "badges_heading";

    UPDATE "home_page_rels"
      SET "path" = 'badges'
      WHERE "path" = 'badgesSection.badges';
  `)
}
