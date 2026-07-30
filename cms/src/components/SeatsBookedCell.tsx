'use client'
import React, { useEffect, useState } from 'react'
import type { DefaultCellComponentProps } from 'payload'

/**
 * List-view cell for Course Schedules "Seats Booked": renders "10 / 20" and,
 * when the session has outstanding admin-sent payment links, an orange
 * "+N links" badge — seats promised but not yet paid. The badge only appears
 * when there is something to show, and the cell wraps as a flex row so the
 * badge drops below the numbers on narrow screens instead of overflowing.
 *
 * Hold counts are fetched ONCE per page load (module-level cache shared by
 * every row's cell) — not one request per row.
 */

let holdsPromise: Promise<Record<number, number>> | null = null

function getHolds(): Promise<Record<number, number>> {
  if (!holdsPromise) {
    holdsPromise = fetch(
      '/api/pending-bookings?where[status][equals]=pending&where[source][equals]=admin-link&limit=500&depth=0',
      { credentials: 'include' },
    )
      .then((r) => (r.ok ? r.json() : { docs: [] }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((j: any) => {
        const map: Record<number, number> = {}
        for (const d of j.docs ?? []) {
          const sid =
            typeof d.courseSchedule === 'object' && d.courseSchedule !== null
              ? d.courseSchedule.id
              : d.courseSchedule
          if (sid) map[sid] = (map[sid] ?? 0) + 1
        }
        return map
      })
      .catch(() => ({}))
    // Let the cache go stale after 30s so revisiting the list shows fresh data
    setTimeout(() => { holdsPromise = null }, 30_000)
  }
  return holdsPromise
}

export default function SeatsBookedCell({ cellData, rowData }: DefaultCellComponentProps) {
  const [held, setHeld] = useState(0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scheduleId = (rowData as any)?.id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maxSeats = (rowData as any)?.maxSeats ?? 0

  useEffect(() => {
    let live = true
    if (scheduleId) {
      getHolds().then((m) => { if (live) setHeld(m[scheduleId] ?? 0) })
    }
    return () => { live = false }
  }, [scheduleId])

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
      <span style={{ whiteSpace: 'nowrap' }}>
        {(cellData as number) ?? 0} / {maxSeats}
      </span>
      {held > 0 && (
        <span
          title={`${held} outstanding payment link${held === 1 ? '' : 's'} holding seats on the website`}
          style={{
            display: 'inline-block', padding: '1px 7px', borderRadius: '999px',
            fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap',
            background: 'rgba(234, 88, 12, 0.12)', color: '#ea580c',
            border: '1px solid rgba(234, 88, 12, 0.35)',
          }}
        >
          +{held} pending
        </span>
      )}
    </span>
  )
}
