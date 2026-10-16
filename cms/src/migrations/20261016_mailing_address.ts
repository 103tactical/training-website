import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Optional US mailing address, required at booking time only for courses that
 * set the new `requiresMailingAddress` toggle (built for the NJ CCW course).
 *
 * STRICTLY ADDITIVE: new nullable columns + one boolean with a default. No
 * existing row is modified, renamed, or constrained. Column names follow the
 * Payload/Drizzle convention for a group field named `mailingAddress`
 * (`mailing_address_<part>`).
 *
 *   courses                            requires_mailing_address  boolean default false
 *   attendees                          mailing_address_{street,street2,city,state,zip}
 *                                      mailing_address_line  (one-line summary synced by a
 *                                      beforeChange hook; the roster/list column)
 *   pending_bookings                   mailing_address_{street,street2,city,state,zip}
 *   private_group_bookings_attendees   mailing_address_{street,street2,city,state,zip}
 */

const PARTS = ['street', 'street2', 'city', 'state', 'zip'] as const
const TABLES = ['attendees', 'pending_bookings', 'private_group_bookings_attendees'] as const

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "requires_mailing_address" boolean DEFAULT false;
  `)
  for (const table of TABLES) {
    for (const part of PARTS) {
      await db.execute(
        sql.raw(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "mailing_address_${part}" varchar;`),
      )
    }
  }
  await db.execute(sql`
    ALTER TABLE "attendees" ADD COLUMN IF NOT EXISTS "mailing_address_line" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "attendees" DROP COLUMN IF EXISTS "mailing_address_line";
  `)
  for (const table of TABLES) {
    for (const part of PARTS) {
      await db.execute(
        sql.raw(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "mailing_address_${part}";`),
      )
    }
  }
  await db.execute(sql`
    ALTER TABLE "courses" DROP COLUMN IF EXISTS "requires_mailing_address";
  `)
}
