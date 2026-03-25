import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // ── Base global table ─────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "store_page" (
      "id"                               serial PRIMARY KEY NOT NULL,
      "hero_image_id"                    integer,
      "header_title"                     varchar,
      "header_subtext"                   varchar,
      "show_prices"                      boolean DEFAULT false,
      "featured_product_heading"         varchar,
      "featured_product_image_id"        integer,
      "featured_product_badge"           varchar,
      "featured_product_brand"           varchar,
      "featured_product_name"            varchar,
      "featured_product_caliber"         varchar,
      "featured_product_description"     varchar,
      "featured_product_price"           numeric,
      "pistols_section_heading"          varchar,
      "rifles_section_heading"           varchar,
      "shotguns_section_heading"         varchar,
      "accessories_section_heading"      varchar,
      "visit_cta_heading"                varchar,
      "visit_cta_subtext"                varchar,
      "visit_cta_directions_url"         varchar,
      "updated_at"                       timestamp(3) with time zone,
      "created_at"                       timestamp(3) with time zone
    );

    ALTER TABLE "store_page"
      ADD CONSTRAINT "store_page_hero_image_id_media_id_fk"
        FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;

    ALTER TABLE "store_page"
      ADD CONSTRAINT "store_page_featured_product_image_id_media_id_fk"
        FOREIGN KEY ("featured_product_image_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;

    CREATE INDEX IF NOT EXISTS "store_page_hero_image_idx"
      ON "store_page" USING btree ("hero_image_id");
    CREATE INDEX IF NOT EXISTS "store_page_featured_product_image_idx"
      ON "store_page" USING btree ("featured_product_image_id");
  `)

  // ── Pistols products ──────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "store_page_pistols_section_products" (
      "_order"      integer NOT NULL,
      "_parent_id"  integer NOT NULL,
      "id"          varchar PRIMARY KEY NOT NULL,
      "image_id"    integer,
      "badge"       varchar,
      "brand"       varchar,
      "name"        varchar NOT NULL,
      "caliber"     varchar,
      "description" varchar,
      "price"       numeric
    );

    ALTER TABLE "store_page_pistols_section_products"
      ADD CONSTRAINT "store_page_pistols_section_products_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."store_page"("id")
        ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "store_page_pistols_section_products"
      ADD CONSTRAINT "store_page_pistols_section_products_image_id_media_id_fk"
        FOREIGN KEY ("image_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;

    CREATE INDEX IF NOT EXISTS "store_page_pistols_section_products_order_idx"
      ON "store_page_pistols_section_products" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "store_page_pistols_section_products_parent_id_idx"
      ON "store_page_pistols_section_products" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "store_page_pistols_section_products_image_idx"
      ON "store_page_pistols_section_products" USING btree ("image_id");
  `)

  // ── Rifles products ───────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "store_page_rifles_section_products" (
      "_order"      integer NOT NULL,
      "_parent_id"  integer NOT NULL,
      "id"          varchar PRIMARY KEY NOT NULL,
      "image_id"    integer,
      "badge"       varchar,
      "brand"       varchar,
      "name"        varchar NOT NULL,
      "caliber"     varchar,
      "description" varchar,
      "price"       numeric
    );

    ALTER TABLE "store_page_rifles_section_products"
      ADD CONSTRAINT "store_page_rifles_section_products_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."store_page"("id")
        ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "store_page_rifles_section_products"
      ADD CONSTRAINT "store_page_rifles_section_products_image_id_media_id_fk"
        FOREIGN KEY ("image_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;

    CREATE INDEX IF NOT EXISTS "store_page_rifles_section_products_order_idx"
      ON "store_page_rifles_section_products" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "store_page_rifles_section_products_parent_id_idx"
      ON "store_page_rifles_section_products" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "store_page_rifles_section_products_image_idx"
      ON "store_page_rifles_section_products" USING btree ("image_id");
  `)

  // ── Shotguns products ─────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "store_page_shotguns_section_products" (
      "_order"      integer NOT NULL,
      "_parent_id"  integer NOT NULL,
      "id"          varchar PRIMARY KEY NOT NULL,
      "image_id"    integer,
      "badge"       varchar,
      "brand"       varchar,
      "name"        varchar NOT NULL,
      "caliber"     varchar,
      "description" varchar,
      "price"       numeric
    );

    ALTER TABLE "store_page_shotguns_section_products"
      ADD CONSTRAINT "store_page_shotguns_section_products_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."store_page"("id")
        ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "store_page_shotguns_section_products"
      ADD CONSTRAINT "store_page_shotguns_section_products_image_id_media_id_fk"
        FOREIGN KEY ("image_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;

    CREATE INDEX IF NOT EXISTS "store_page_shotguns_section_products_order_idx"
      ON "store_page_shotguns_section_products" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "store_page_shotguns_section_products_parent_id_idx"
      ON "store_page_shotguns_section_products" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "store_page_shotguns_section_products_image_idx"
      ON "store_page_shotguns_section_products" USING btree ("image_id");
  `)

  // ── Accessories items ─────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "store_page_accessories_section_items" (
      "_order"      integer NOT NULL,
      "_parent_id"  integer NOT NULL,
      "id"          varchar PRIMARY KEY NOT NULL,
      "image_id"    integer,
      "badge"       varchar,
      "brand"       varchar,
      "name"        varchar NOT NULL,
      "caliber"     varchar,
      "description" varchar,
      "price"       numeric
    );

    ALTER TABLE "store_page_accessories_section_items"
      ADD CONSTRAINT "store_page_accessories_section_items_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."store_page"("id")
        ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "store_page_accessories_section_items"
      ADD CONSTRAINT "store_page_accessories_section_items_image_id_media_id_fk"
        FOREIGN KEY ("image_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;

    CREATE INDEX IF NOT EXISTS "store_page_accessories_section_items_order_idx"
      ON "store_page_accessories_section_items" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "store_page_accessories_section_items_parent_id_idx"
      ON "store_page_accessories_section_items" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "store_page_accessories_section_items_image_idx"
      ON "store_page_accessories_section_items" USING btree ("image_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "store_page_accessories_section_items";
    DROP TABLE IF EXISTS "store_page_shotguns_section_products";
    DROP TABLE IF EXISTS "store_page_rifles_section_products";
    DROP TABLE IF EXISTS "store_page_pistols_section_products";
    DROP TABLE IF EXISTS "store_page";
  `)
}
