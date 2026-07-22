import type { CourseSchedule } from "~/lib/payload";

/**
 * Shared "is this session still bookable?" rule.
 *
 * A schedule is bookable until its FIRST session's start time has passed
 * (you can't join a class that already started). Sessions with no start
 * time remain bookable through the end of their calendar day.
 *
 * All comparisons are done as wall-clock time in America/New_York — the same
 * timezone the times are displayed in on the site and entered in the CMS.
 *
 * Implementation note: session.date is stored at midnight UTC of the calendar
 * day, so its UTC Y-M-D IS the calendar day. startTime is a timestamp whose
 * meaningful part is its Eastern-time clock reading (that's how the CMS
 * displays and the site renders it). We therefore compare Y-M-D + HH:mm
 * strings, avoiding UTC-offset math entirely.
 */

const ET = "America/New_York";

/** Y-M-D of the session's calendar day (stored midnight-UTC). */
function sessionDay(dateIso: string): string {
  return dateIso.slice(0, 10);
}

/** HH:mm (24h) of a timestamp as read in Eastern time. */
function easternClock(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: ET,
  }).format(new Date(iso));
}

/** Current Eastern-time calendar day (Y-M-D) and clock (HH:mm). */
function easternNow(): { day: string; clock: string } {
  const now = new Date();
  const day = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: ET,
  }).format(now);
  return { day, clock: easternClock(now.toISOString()) };
}

export function isScheduleBookable(
  schedule: Pick<CourseSchedule, "sessions">,
): boolean {
  const first = schedule.sessions?.[0];
  if (!first?.date) return false;

  const day = sessionDay(first.date);
  const { day: nowDay, clock: nowClock } = easternNow();

  if (day > nowDay) return true;   // future day
  if (day < nowDay) return false;  // past day

  // Today: bookable until the class starts. No start time -> all day.
  if (!first.startTime) return true;
  return easternClock(first.startTime) > nowClock;
}
