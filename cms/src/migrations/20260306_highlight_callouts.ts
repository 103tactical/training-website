import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "home_page_highlight_callouts_items" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "background_image_id" integer,
      "background_color" varchar,
      "title" varchar NOT NULL,
      "subtext" varchar NOT NULL,
      "button_label" varchar,
      "button_url" varchar,
      "button_open_in_new_tab" boolean DEFAULT false
    );

    ALTER TABLE "home_page_highlight_callouts_items"
      ADD CONSTRAINT "home_page_highlight_callouts_items_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id")
        ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "home_page_highlight_callouts_items"
      ADD CONSTRAINT "home_page_highlight_callouts_items_background_image_id_media_id_fk"
        FOREIGN KEY ("background_image_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;

    CREATE INDEX IF NOT EXISTS "home_page_highlight_callouts_items_order_idx"
      ON "home_page_highlight_callouts_items" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "home_page_highlight_callouts_items_parent_id_idx"
      ON "home_page_highlight_callouts_items" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "home_page_highlight_callouts_items_background_image_idx"
      ON "home_page_highlight_callouts_items" USING btree ("background_image_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "home_page_highlight_callouts_items";
  `)
}
