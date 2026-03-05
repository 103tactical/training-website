import * as migration_20260305_050829 from './20260305_050829';
import * as migration_20260305_featured_courses_group from './20260305_featured_courses_group';

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
];
