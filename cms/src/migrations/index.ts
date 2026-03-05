import * as migration_20260305_050829 from './20260305_050829';
import * as migration_20260305_featured_courses_group from './20260305_featured_courses_group';
import * as migration_20260305_media_alt_nullable from './20260305_media_alt_nullable';

export const migrations = [
  {
    up: migration_20260305_050829.up,
    down: migration_20260305_050829.down,
    name: '20260305_050829'
  },
  {
    up: migration_20260305_featured_courses_group.up,
    down: migration_20260305_featured_courses_group.down,
    name: '20260305_featured_courses_group'
  },
  {
    up: migration_20260305_media_alt_nullable.up,
    down: migration_20260305_media_alt_nullable.down,
    name: '20260305_media_alt_nullable'
  },
];
