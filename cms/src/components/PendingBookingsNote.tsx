import React from 'react'

/**
 * Rendered under the Bookings list. Pending Bookings is deliberately absent
 * from the nav and dashboard — it is a system-managed ledger, so its only
 * entry point is this contextual link with guidance on when to touch it.
 */
export default function PendingBookingsNote() {
  return (
    <div
      style={{
        margin: '2rem 0 1rem',
        padding: '1.25rem 1.5rem',
        borderRadius: '8px',
        background: 'var(--theme-elevation-50)',
        maxWidth: '52rem',
      }}
    >
      <p style={{ margin: 0, fontWeight: 600 }}>Looking for Pending Bookings?</p>
      <p style={{ margin: '0.5rem 0 0', color: 'var(--theme-elevation-600)', lineHeight: 1.55 }}>
        Pending Bookings is the system&rsquo;s ledger of started checkouts and outstanding payment
        links. It runs itself: paid records become Bookings automatically, abandoned ones expire
        after the course date. You normally never need to touch it, with three exceptions &mdash;
        press <strong>Retry</strong> on a Failed record (you&rsquo;ll receive an email alert if that
        ever happens), use <strong>Email Expired Leads</strong> to market to people who didn&rsquo;t
        finish checkout, or delete an admin-sent link&rsquo;s record to release its held seat when
        someone isn&rsquo;t coming.
      </p>
      <p style={{ margin: '0.75rem 0 0' }}>
        <a href="/admin/collections/pending-bookings">Open Pending Bookings &rarr;</a>
      </p>
    </div>
  )
}
