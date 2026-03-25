import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "home_page_testimonials_section_items" (
      "_order"     integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id"         varchar PRIMARY KEY NOT NULL,
      "quote"      varchar NOT NULL,
      "name"       varchar NOT NULL,
      "context"    varchar
    );

    ALTER TABLE "home_page_testimonials_section_items"
      ADD CONSTRAINT "home_page_testimonials_section_items_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id")
        ON DELETE cascade ON UPDATE no action;

    CREATE INDEX IF NOT EXISTS "home_page_testimonials_section_items_order_idx"
      ON "home_page_testimonials_section_items" USING btree ("_order");

    CREATE INDEX IF NOT EXISTS "home_page_testimonials_section_items_parent_id_idx"
      ON "home_page_testimonials_section_items" USING btree ("_parent_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "home_page_testimonials_section_items";
  `)
}
