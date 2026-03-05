import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "contact_settings_topics" (
      "_order"     integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id"         varchar PRIMARY KEY NOT NULL,
      "label"      varchar NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "contact_settings" (
      "id"         serial PRIMARY KEY NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    ALTER TABLE "contact_settings_topics"
      ADD CONSTRAINT "contact_settings_topics_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."contact_settings"("id")
        ON DELETE cascade ON UPDATE no action;

    CREATE INDEX IF NOT EXISTS "contact_settings_topics_order_idx"
      ON "contact_settings_topics" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "contact_settings_topics_parent_id_idx"
      ON "contact_settings_topics" USING btree ("_parent_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "contact_settings_topics" CASCADE;
    DROP TABLE IF EXISTS "contact_settings" CASCADE;
  `)
}
