'use client'
/**
 * Live transfer warning — rendered directly below the Session field on a
 * Booking. When the admin selects a DIFFERENT session than the one saved,
 * this checks the target session and warns (without blocking) if:
 *   1. the target is already full — saving will overbook it, and/or
 *   2. the target has waitlisted attendees — the moved person would be
 *      placed ahead of everyone on the waitlist.
 *
 * Purely informational: the admin can always still save. Transfers are
 * deliberately never blocked (the hard guards only apply to NEW bookings).
 */
import React, { useEffect, useState } from 'react'
import { useFormFields } from '@payloadcms/ui'

interface TargetInfo {
  label: string
  maxSeats: number
  seatsBooked: number
  waitlisted: number
}

function resolveId(val: unknown): string | null {
  if (val == null) return null
  if (typeof val === 'object' && val !== null && 'id' in val) {
    return String((val as { id: number | string }).id)
  }
  return String(val)
}

export default function TransferWarning() {
  const { scheduleValue, scheduleInitial, statusValue } = useFormFields(([fields]) => ({
    scheduleValue: fields?.courseSchedule?.value,
    scheduleInitial: fields?.courseSchedule?.initialValue,
    statusValue: fields?.status?.value,
  }))

  const currentId = resolveId(scheduleValue)
  const originalId = resolveId(scheduleInitial)

  // A transfer is "in progress" when an existing booking's session has been
  // changed to a different one (new bookings have no initialValue — the
  // create-time guards already cover those).
  const isTransfer = Boolean(originalId && currentId && currentId !== originalId)

  // Cancelled bookings don't occupy a seat — nothing to warn about.
  const isActive = statusValue === 'confirmed' || statusValue === 'waitlisted'

  const [target, setTarget] = useState<TargetInfo | null>(null)

  useEffect(() => {
    setTarget(null)
    if (!isTransfer || !isActive || !currentId) return

    let stale = false
    const timer = setTimeout(async () => {
      try {
        const [schedRes, waitRes] = await Promise.all([
          fetch(`/api/course-schedules/${currentId}?depth=0`, { credentials: 'include' }),
          fetch(
            `/api/bookings?where[courseSchedule][equals]=${currentId}&where[status][equals]=waitlisted&limit=1&depth=0`,
            { credentials: 'include' },
          ),
        ])
        if (!schedRes.ok) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sched: any = await schedRes.json()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const waits: any = waitRes.ok ? await waitRes.json() : { totalDocs: 0 }
        if (stale) return
        setTarget({
          label: sched.adminTitle ?? sched.displayLabel ?? sched.label ?? 'the selected session',
          maxSeats: typeof sched.maxSeats === 'number' ? sched.maxSeats : 0,
          seatsBooked: typeof sched.seatsBooked === 'number' ? sched.seatsBooked : 0,
          waitlisted: typeof waits.totalDocs === 'number' ? waits.totalDocs : 0,
        })
      } catch {
        /* warning is best-effort — never interfere with the form */
      }
    }, 350)

    return () => {
      stale = true
      clearTimeout(timer)
    }
  }, [isTransfer, isActive, currentId])

  if (!isTransfer || !isActive || !target) return null

  const wouldOverbook = target.seatsBooked >= target.maxSeats
  const hasWaitlist = target.waitlisted > 0
  if (!wouldOverbook && !hasWaitlist) return null

  return (
    <div
      style={{
        margin: '4px 0 16px',
        padding: '12px 16px',
        borderRadius: 'var(--style-radius-s, 4px)',
        border: '1px solid #f59e0b',
        background: 'rgba(245, 158, 11, 0.09)',
        fontSize: '13px',
        lineHeight: 1.55,
        color: 'var(--theme-text)',
      }}
    >
      <p style={{ margin: 0, fontWeight: 700, color: '#b45309' }}>
        ⚠ Heads up about this transfer
      </p>
      <ul style={{ margin: '8px 0 0', paddingLeft: '18px' }}>
        {wouldOverbook && (
          <li>
            <strong>{target.label}</strong> is already full ({target.seatsBooked}/{target.maxSeats}).
            Saving will overbook it to {target.seatsBooked + 1} of {target.maxSeats} seats —
            make sure there&apos;s room in the classroom.
          </li>
        )}
        {hasWaitlist && (
          <li>
            That session has <strong>{target.waitlisted} waitlisted attendee{target.waitlisted === 1 ? '' : 's'}</strong>.
            Moving this person in places them <strong>ahead of everyone on the waitlist</strong>.
          </li>
        )}
      </ul>
      <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--theme-elevation-600)' }}>
        This is only a warning — you can still save the transfer.
      </p>
    </div>
  )
}
