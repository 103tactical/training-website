import React from 'react'

/**
 * Injected into the Payload admin as a provider so we can override
 * collapsible field header styling to match the prominence of array
 * field labels (h3). Targets `.collapsible__toggle-wrap .row-label`.
 */
export default function AdminStyles({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        /* Make collapsible section headers (Course Info, Attendee Roster)
           visually match the h3 used by the Session Dates array field */
        .collapsible__toggle-wrap .row-label {
          font-size: 1.125rem;
          font-weight: 600;
          letter-spacing: -0.01em;
          line-height: 1.3;
        }
        .collapsible__toggle-wrap {
          padding-top: 0.6rem;
          padding-bottom: 0.6rem;
        }

        /* Hide the clear (×) button on read-only date fields */
        .date-time-picker__clear-button { display: none !important; }
      `}</style>
      {children}
    </>
  )
}
