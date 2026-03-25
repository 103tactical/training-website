'use client'
import React from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * Shown above the Attendee Rosters list.
 * When the list is filtered to a specific session, displays a Print Roster link.
 */
export default function PrintRosterListAction() {
  const searchParams = useSearchParams()

  // Payload list filters look like: ?where[courseSchedule][equals]=5
  const scheduleId = searchParams.get('where[courseSchedule][equals]')

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? ''
  const token  = process.env.NEXT_PUBLIC_PRINT_SECRET ?? ''
  const query  = token ? `?token=${token}` : ''

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 0 4px',
        borderBottom: '1px solid var(--theme-elevation-100)',
        marginBottom: 'var(--base)',
      }}
    >
      {scheduleId ? (
        <a
          href={`${webUrl}/print/roster/${scheduleId}${query}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 16px',
            background: 'var(--theme-elevation-100)',
            border: '1px solid var(--theme-elevation-250)',
            borderRadius: 'var(--style-radius-s)',
            color: 'var(--theme-text)',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <span aria-hidden="true">🖨</span> Print Roster for this Session
        </a>
      ) : (
        <span style={{ fontSize: '13px', color: 'var(--theme-elevation-500)' }}>
          Filter by Session to enable Print Roster
        </span>
      )}
    </div>
  )
}
