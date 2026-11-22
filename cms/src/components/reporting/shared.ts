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

// ── Refund facts (2026-11-22) ───────────────────────────────────────────────
// RULE: a report never infers a refund from a booking's status. Until this date
// every report counted "cancelled + paid by card" as refunded in full, which
// overstated refunds for a booking cancelled WITHOUT a refund. Refund figures
// come only from what is stored on the booking:
//   squareRefundedCents      what was refunded through Square: written when Square
//                            accepts the refund, then confirmed or corrected by
//                            Square's webhook (Square is the source of truth)
//   manualRefundAmountCents  what the admin typed in for money returned another way
// Whatever was paid and is covered by neither is reported as "no refund
// recorded" — visible, never counted as refunded, never dropped. It does NOT
// mean the business kept the money: it may have been returned some other way
// that nobody recorded.

/** Cents Square has confirmed refunding on this booking's payment. */
export function squareRefundedCents(b: RawBooking): number {
  return Number(b.squareRefundedCents ?? 0) || 0
}

/** Cents the admin recorded as refunded outside Square (cash, POS, …). */
export function manualRefundedCents(b: RawBooking): number {
  return Number(b.manualRefundAmountCents ?? 0) || 0
}

/** Total refund on record for this booking (Square-confirmed + manually recorded). */
export function refundedCents(b: RawBooking): number {
  return squareRefundedCents(b) + manualRefundedCents(b)
}

/**
 * True when the admin cancelled WITH a card refund but no refund is on record.
 * The refund is recorded the moment Square accepts it, so this state means the
 * request to Square failed (or the record could not be written) — someone must
 * check the payment in Square. It clears on its own if Square later confirms.
 */
export function isAwaitingSquareRefund(b: RawBooking): boolean {
  return (
    b.status === 'cancelled' &&
    !!b.squarePaymentId &&
    !b.skipRefund &&
    b.squareRefundedCents == null &&
    Number(b.amountPaidCents ?? 0) > 0
  )
}

/**
 * Cents paid on a cancelled booking that no recorded refund accounts for.
 * Zero while a Square refund is still awaiting confirmation (that amount is
 * reported separately as pending, not as unaccounted).
 */
export function noRefundRecordedCents(b: RawBooking): number {
  if (b.status !== 'cancelled' || isAwaitingSquareRefund(b)) return 0
  return Math.max(0, Number(b.amountPaidCents ?? 0) - refundedCents(b))
}

/** When the booking was cancelled (stored fact; falls back for legacy rows). */
export function cancelledDate(b: RawBooking): string | null | undefined {
  return b.cancelledAt ?? b.updatedAt
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  'online':        'Website / Payment Link',
  'square-manual': 'Square POS',
  'cash':          'Cash',
  'check':         'Check',
  'other':         'Other',
}

/** Human label for a booking's payment method; falls back for legacy rows. */
export function getPaymentMethod(b: RawBooking): string {
  if (b.paymentMethod && PAYMENT_METHOD_LABELS[b.paymentMethod]) {
    return PAYMENT_METHOD_LABELS[b.paymentMethod]
  }
  // Legacy rows without the field: infer online from the Square order id
  if (b.squareOrderId) return 'Online'
  return '—'
}
