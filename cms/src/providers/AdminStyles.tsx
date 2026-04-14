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

        /* Save button — orange only when there are unsaved changes.
           Uses the id + :not([disabled]) so the clean/saved greyscale
           state (disabled attribute present) is left completely alone. */
        #action-save:not([disabled]) {
          background-color: #ea580c !important;
          border-color: #c2410c !important;
          color: #ffffff !important;
        }
        #action-save:not([disabled]):hover {
          background-color: #c2410c !important;
          border-color: #9a3412 !important;
        }

        /* Hide the clear (×) button on read-only date fields */
        .date-time-picker__clear-button { display: none !important; }

        /* ── Shared roster action button ──────────────────────────────────── */
        .roster-btn {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 9px 20px;
          border-radius: var(--style-radius-s);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          border: 1px solid rgba(249, 115, 22, 0.4);
          background: rgba(249, 115, 22, 0.08);
          color: #b45309;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .roster-btn:hover {
          background: rgba(249, 115, 22, 0.16);
          border-color: rgba(249, 115, 22, 0.65);
        }
        .roster-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .roster-btn__icon {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        /* Dark mode — brighter text so it reads against a dark surface */
        [data-theme="dark"] .roster-btn {
          color: #fb923c;
          border-color: rgba(249, 115, 22, 0.45);
          background: rgba(249, 115, 22, 0.1);
        }
        [data-theme="dark"] .roster-btn:hover {
          background: rgba(249, 115, 22, 0.18);
          border-color: rgba(249, 115, 22, 0.7);
        }
      `}</style>
      {children}
    </>
  )
}
