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
        padding: '10px var(--gutter-h, 24px) 4px',
        borderBottom: '1px solid var(--theme-elevation-100)',
        marginBottom: 'var(--base)',
      }}
    >
      {scheduleId ? (
        <a
          href={`${webUrl}/print/roster/${scheduleId}${query}`}
          target="_blank"
          rel="noopener noreferrer"
          className="roster-btn"
        >
          <span className="roster-btn__icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
          </span>
          Print Roster for this Session
        </a>
      ) : (
        <span style={{ fontSize: '13px', color: 'var(--theme-elevation-500)' }}>
          Filter by Session to enable Print Roster
        </span>
      )}
    </div>
  )
}
