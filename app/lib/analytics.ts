/**
 * Thin wrapper around window.gtag for GA4 custom event tracking.
 * All calls are no-ops on the server or when gtag hasn't loaded.
 */

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag: (...args: any[]) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataLayer: any[];
  }
}

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params);
}

// ── Typed event helpers ────────────────────────────────────────────────────

export function trackCourseView(courseName: string, courseSlug: string) {
  trackEvent("course_view", { course_name: courseName, course_slug: courseSlug });
}

export function trackScheduleView(courseName: string, courseSlug: string) {
  trackEvent("schedule_view", { course_name: courseName, course_slug: courseSlug });
}

export function trackScheduleNowClick(courseName: string, courseSlug: string, source: string) {
  trackEvent("schedule_now_click", {
    course_name: courseName,
    course_slug: courseSlug,
    source, // "course_card" | "course_detail" | "schedule_page"
  });
}

export function trackContactFormSubmit(topic: string) {
  trackEvent("contact_form_submit", { topic });
}

export function trackApplicationsView() {
  trackEvent("applications_page_view");
}

export function trackStoreView() {
  trackEvent("store_page_view");
}
