import * as migration_20260305_050829 from './20260305_050829';
import * as migration_20260305_featured_courses_group from './20260305_featured_courses_group';
import * as migration_20260305_media_alt_nullable from './20260305_media_alt_nullable';
import * as migration_20260305_badges_group from './20260305_badges_group';
import * as migration_20260305_website_headline from './20260305_website_headline';
import * as migration_20260305_video_preview_images from './20260305_video_preview_images';
import * as migration_20260305_utility_carousel_delay from './20260305_utility_carousel_delay';
import * as migration_20260305_site_settings_logo_footer from './20260305_site_settings_logo_footer';
import * as migration_20260305_site_settings_logos_group from './20260305_site_settings_logos_group';
import * as migration_20260305_fix_site_settings_logos from './20260305_fix_site_settings_logos';
import * as migration_20260305_why_choose_items_icon from './20260305_why_choose_items_icon';
import * as migration_20260305_contact_settings from './20260305_contact_settings';
import * as migration_20260305_contact_submissions_topic_status from './20260305_contact_submissions_topic_status';
import * as migration_20260305_contact_settings_hero_image from './20260305_contact_settings_hero_image';
import * as migration_20260306_course_groups from './20260306_course_groups';
import * as migration_20260306_course_groups_to_collection from './20260306_course_groups_to_collection';
import * as migration_20260306_homepage_group_sections from './20260306_homepage_group_sections';
import * as migration_20260306_courses_page from './20260306_courses_page';
import * as migration_20260306_highlight_callouts from './20260306_highlight_callouts';
import * as migration_20260306_highlight_callouts_odd_placement from './20260306_highlight_callouts_odd_placement';
import * as migration_20260304_course_description_and_duration from './20260304_course_description_and_duration';
import * as migration_20260307_course_schedules from './20260307_course_schedules';
import * as migration_20260309_course_schedules from './20260309_course_schedules';
import * as migration_20260310_applications_page from './20260310_applications_page';
import * as migration_20260310_site_settings_logo_header_wide from './20260310_site_settings_logo_header_wide';
import * as migration_20260311_site_settings_logo_refactor from './20260311_site_settings_logo_refactor';
import * as migration_20260325_testimonials_section from './20260325_testimonials_section';
import * as migration_20260325_store_page from './20260325_store_page';

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
  {
    up: migration_20260305_site_settings_logos_group.up,
    down: migration_20260305_site_settings_logos_group.down,
    name: '20260305_site_settings_logos_group'
  },
  {
    up: migration_20260305_fix_site_settings_logos.up,
    down: migration_20260305_fix_site_settings_logos.down,
    name: '20260305_fix_site_settings_logos'
  },
  {
    up: migration_20260305_why_choose_items_icon.up,
    down: migration_20260305_why_choose_items_icon.down,
    name: '20260305_why_choose_items_icon'
  },
  {
    up: migration_20260305_contact_settings.up,
    down: migration_20260305_contact_settings.down,
    name: '20260305_contact_settings'
  },
  {
    up: migration_20260305_contact_submissions_topic_status.up,
    down: migration_20260305_contact_submissions_topic_status.down,
    name: '20260305_contact_submissions_topic_status'
  },
  {
    up: migration_20260305_contact_settings_hero_image.up,
    down: migration_20260305_contact_settings_hero_image.down,
    name: '20260305_contact_settings_hero_image'
  },
  {
    up: migration_20260304_course_description_and_duration.up,
    down: migration_20260304_course_description_and_duration.down,
    name: '20260304_course_description_and_duration'
  },
  {
    up: migration_20260306_course_groups.up,
    down: migration_20260306_course_groups.down,
    name: '20260306_course_groups'
  },
  {
    up: migration_20260306_course_groups_to_collection.up,
    down: migration_20260306_course_groups_to_collection.down,
    name: '20260306_course_groups_to_collection'
  },
  {
    up: migration_20260306_homepage_group_sections.up,
    down: migration_20260306_homepage_group_sections.down,
    name: '20260306_homepage_group_sections'
  },
  {
    up: migration_20260306_courses_page.up,
    down: migration_20260306_courses_page.down,
    name: '20260306_courses_page'
  },
  {
    up: migration_20260306_highlight_callouts.up,
    down: migration_20260306_highlight_callouts.down,
    name: '20260306_highlight_callouts'
  },
  {
    up: migration_20260306_highlight_callouts_odd_placement.up,
    down: migration_20260306_highlight_callouts_odd_placement.down,
    name: '20260306_highlight_callouts_odd_placement'
  },
  {
    up: migration_20260307_course_schedules.up,
    down: migration_20260307_course_schedules.down,
    name: '20260307_course_schedules'
  },
  {
    up: migration_20260309_course_schedules.up,
    down: migration_20260309_course_schedules.down,
    name: '20260309_course_schedules'
  },
  {
    up: migration_20260310_applications_page.up,
    down: migration_20260310_applications_page.down,
    name: '20260310_applications_page'
  },
  {
    up: migration_20260310_site_settings_logo_header_wide.up,
    down: migration_20260310_site_settings_logo_header_wide.down,
    name: '20260310_site_settings_logo_header_wide'
  },
  {
    up: migration_20260311_site_settings_logo_refactor.up,
    down: migration_20260311_site_settings_logo_refactor.down,
    name: '20260311_site_settings_logo_refactor'
  },
  {
    up: migration_20260325_testimonials_section.up,
    down: migration_20260325_testimonials_section.down,
    name: '20260325_testimonials_section'
  },
  {
    up: migration_20260325_store_page.up,
    down: migration_20260325_store_page.down,
    name: '20260325_store_page'
  },
];
