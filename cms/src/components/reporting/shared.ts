// ── Shared utilities for Accounting & Reporting views ──────────────────────

export function formatCents(cents: number | null | undefined): string {
  if (cents == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  } catch { return iso }
}

export interface DateRange { from: Date; to: Date }

export function getDateRange(
  period: string | undefined,
  customStart?: string,
  customEnd?: string,
): DateRange {
  const now  = new Date()
  const to   = new Date(); to.setHours(23, 59, 59, 999)

  switch (period) {
    case 'this-week': {
      const from = new Date(now)
      from.setDate(now.getDate() - now.getDay())
      from.setHours(0, 0, 0, 0)
      return { from, to }
    }
    case 'this-month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to }
    case 'this-quarter': {
      const q = Math.floor(now.getMonth() / 3)
      return { from: new Date(now.getFullYear(), q * 3, 1), to }
    }
    case 'this-year':
      return { from: new Date(now.getFullYear(), 0, 1), to }
    case 'custom': {
      const from = customStart ? new Date(customStart) : new Date(2020, 0, 1)
      const customTo = customEnd ? new Date(customEnd) : to
      customTo.setHours(23, 59, 59, 999)
      return { from, to: customTo }
    }
    default: // all-time
      return { from: new Date(2020, 0, 1), to }
  }
}

export const PERIOD_LABELS: Record<string, string> = {
  'this-week':    'This Week',
  'this-month':   'This Month',
  'this-quarter': 'This Quarter',
  'this-year':    'This Year',
  'all-time':     'All Time',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RawBooking = Record<string, any>

export function getCourseName(b: RawBooking): string {
  if (b.course && typeof b.course === 'object') return b.course.title ?? '—'
  return '—'
}

export function getAttendeeName(b: RawBooking): string {
  if (b.attendee && typeof b.attendee === 'object') {
    const name = [b.attendee.firstName, b.attendee.lastName].filter(Boolean).join(' ')
    return name || b.adminTitle || '—'
  }
  return b.adminTitle ?? '—'
}

export function getAttendeeEmail(b: RawBooking): string {
  if (b.attendee && typeof b.attendee === 'object') return b.attendee.email ?? '—'
  return '—'
}

export function getSessionLabel(b: RawBooking): string {
  if (b.courseSchedule && typeof b.courseSchedule === 'object') {
    return b.courseSchedule.displayLabel ?? b.courseSchedule.label ?? '—'
  }
  return '—'
}
