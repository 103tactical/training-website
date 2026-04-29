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
import * as migration_20260325_home_page_testimonials_heading from './20260325_home_page_testimonials_heading';
import * as migration_20260325_attendees from './20260325_attendees';
import * as migration_20260325_instructors_and_schedule_fields from './20260325_instructors_and_schedule_fields';
import * as migration_20260325_course_schedules_admin_title from './20260325_course_schedules_admin_title';
import * as migration_20260325_site_settings_logo_print from './20260325_site_settings_logo_print';
import * as migration_20260325_site_settings_logo_print_v2 from './20260325_site_settings_logo_print_v2';
import * as migration_20260327_seo_fields from './20260327_seo_fields';
import * as migration_20260414_courses_generate_slug from './20260414_courses_generate_slug';
import * as migration_20260414_attendees_bookings_split from './20260414_attendees_bookings_split';
import * as migration_20260414_bookings_transfer_history from './20260414_bookings_transfer_history';
import * as migration_20260304_bookings_square_fields from './20260304_bookings_square_fields';
import * as migration_20260414_pending_bookings from './20260414_pending_bookings';
import * as migration_20260414_courses_enrollment_forms from './20260414_courses_enrollment_forms';
import * as migration_20260421_private_group_bookings from './20260421_private_group_bookings';
import * as migration_20260304_testimonials_heading_update from './20260304_testimonials_heading_update';
import * as migration_20260304_testimonials_heading_update_v2 from './20260304_testimonials_heading_update_v2';
import * as migration_20260421_attendees_lastname_nullable from './20260421_attendees_lastname_nullable';
import * as migration_20260429_site_settings_surcharge from './20260429_site_settings_surcharge';
import * as migration_20260429_ecommerce_global from './20260429_ecommerce_global';
import * as migration_20260429_bookings_manual_refund from './20260429_bookings_manual_refund';
import * as migration_20260429_bookings_skip_refund from './20260429_bookings_skip_refund';

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
  {
    up: migration_20260325_home_page_testimonials_heading.up,
    down: migration_20260325_home_page_testimonials_heading.down,
    name: '20260325_home_page_testimonials_heading'
  },
  {
    up: migration_20260325_attendees.up,
    down: migration_20260325_attendees.down,
    name: '20260325_attendees'
  },
  {
    up: migration_20260325_instructors_and_schedule_fields.up,
    down: migration_20260325_instructors_and_schedule_fields.down,
    name: '20260325_instructors_and_schedule_fields'
  },
  {
    up: migration_20260325_course_schedules_admin_title.up,
    down: migration_20260325_course_schedules_admin_title.down,
    name: '20260325_course_schedules_admin_title'
  },
  {
    up: migration_20260325_site_settings_logo_print.up,
    down: migration_20260325_site_settings_logo_print.down,
    name: '20260325_site_settings_logo_print'
  },
  {
    up: migration_20260325_site_settings_logo_print_v2.up,
    down: migration_20260325_site_settings_logo_print_v2.down,
    name: '20260325_site_settings_logo_print_v2'
  },
  {
    up: migration_20260327_seo_fields.up,
    down: migration_20260327_seo_fields.down,
    name: '20260327_seo_fields'
  },
  {
    up: migration_20260414_courses_generate_slug.up,
    down: migration_20260414_courses_generate_slug.down,
    name: '20260414_courses_generate_slug'
  },
  {
    up: migration_20260414_attendees_bookings_split.up,
    down: migration_20260414_attendees_bookings_split.down,
    name: '20260414_attendees_bookings_split'
  },
  {
    up: migration_20260414_bookings_transfer_history.up,
    down: migration_20260414_bookings_transfer_history.down,
    name: '20260414_bookings_transfer_history'
  },
  {
    up: migration_20260304_bookings_square_fields.up,
    down: migration_20260304_bookings_square_fields.down,
    name: '20260304_bookings_square_fields'
  },
  {
    up: migration_20260414_pending_bookings.up,
    down: migration_20260414_pending_bookings.down,
    name: '20260414_pending_bookings'
  },
  {
    up: migration_20260414_courses_enrollment_forms.up,
    down: migration_20260414_courses_enrollment_forms.down,
    name: '20260414_courses_enrollment_forms'
  },
  {
    up: migration_20260421_private_group_bookings.up,
    down: migration_20260421_private_group_bookings.down,
    name: '20260421_private_group_bookings'
  },
  {
    up: migration_20260304_testimonials_heading_update.up,
    down: migration_20260304_testimonials_heading_update.down,
    name: '20260304_testimonials_heading_update'
  },
  {
    up: migration_20260304_testimonials_heading_update_v2.up,
    down: migration_20260304_testimonials_heading_update_v2.down,
    name: '20260304_testimonials_heading_update_v2'
  },
  {
    up: migration_20260421_attendees_lastname_nullable.up,
    down: migration_20260421_attendees_lastname_nullable.down,
    name: '20260421_attendees_lastname_nullable'
  },
  {
    up: migration_20260429_bookings_skip_refund.up,
    down: migration_20260429_bookings_skip_refund.down,
    name: '20260429_bookings_skip_refund'
  },
  {
    up: migration_20260429_site_settings_surcharge.up,
    down: migration_20260429_site_settings_surcharge.down,
    name: '20260429_site_settings_surcharge'
  },
  {
    up: migration_20260429_ecommerce_global.up,
    down: migration_20260429_ecommerce_global.down,
    name: '20260429_ecommerce_global'
  },
  {
    up: migration_20260429_bookings_manual_refund.up,
    down: migration_20260429_bookings_manual_refund.down,
    name: '20260429_bookings_manual_refund'
  },
];
