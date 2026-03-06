import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

// Stub migration — tables managed separately. This entry exists solely to keep
// the payload_migrations record in sync with the codebase.
export async function up(_args: MigrateUpArgs): Promise<void> {}
export async function down(_args: MigrateDownArgs): Promise<void> {}
