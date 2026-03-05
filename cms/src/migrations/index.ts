import * as migration_20260305_050829 from './20260305_050829';
import * as migration_20260305_featured_courses_group from './20260305_featured_courses_group';
import * as migration_20260305_media_alt_nullable from './20260305_media_alt_nullable';
import * as migration_20260305_badges_group from './20260305_badges_group';
import * as migration_20260305_website_headline from './20260305_website_headline';
import * as migration_20260305_video_preview_images from './20260305_video_preview_images';
import * as migration_20260305_utility_carousel_delay from './20260305_utility_carousel_delay';
import * as migration_20260305_site_settings_logo_footer from './20260305_site_settings_logo_footer';

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
  {
    up: migration_20260305_badges_group.up,
    down: migration_20260305_badges_group.down,
    name: '20260305_badges_group'
  },
  {
    up: migration_20260305_website_headline.up,
    down: migration_20260305_website_headline.down,
    name: '20260305_website_headline'
  },
  {
    up: migration_20260305_video_preview_images.up,
    down: migration_20260305_video_preview_images.down,
    name: '20260305_video_preview_images'
  },
  {
    up: migration_20260305_utility_carousel_delay.up,
    down: migration_20260305_utility_carousel_delay.down,
    name: '20260305_utility_carousel_delay'
  },
  {
    up: migration_20260305_site_settings_logo_footer.up,
    down: migration_20260305_site_settings_logo_footer.down,
    name: '20260305_site_settings_logo_footer'
  },
];
