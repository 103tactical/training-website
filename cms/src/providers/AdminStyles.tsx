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

        /* ── Reporting / Schedule table rows — alternating, theme-aware ──────── */
        .rpt-row:nth-child(odd)  { background: var(--theme-elevation-0); }
        .rpt-row:nth-child(even) { background: var(--theme-elevation-100); }

        /* Period / filter tab pills used in report pages */
        .rpt-tab {
          padding: 6px 14px;
          border-radius: var(--style-radius-s, 4px);
          font-size: 13px;
          text-decoration: none;
          background: var(--theme-elevation-100);
          color: var(--theme-text);
          font-weight: 400;
          transition: background .12s;
        }
        .rpt-tab:hover         { background: var(--theme-elevation-200); }
        .rpt-tab--active       { background: #b91c1c; color: #fff; font-weight: 600; }
        .rpt-tab--active:hover { background: #991b1b; }

        /* Date range inputs in report pages */
        .rpt-date-input {
          padding: 5px 8px;
          border-radius: var(--style-radius-s, 4px);
          border: 1px solid var(--theme-elevation-300);
          background: var(--theme-elevation-100);
          color: var(--theme-text);
          font-size: 12px;
          font-family: inherit;
        }
        .rpt-apply-btn {
          padding: 5px 12px;
          border-radius: var(--style-radius-s, 4px);
          background: var(--theme-elevation-200);
          border: none;
          color: var(--theme-text);
          font-size: 12px;
          cursor: pointer;
          font-family: inherit;
          transition: background .12s;
        }
        .rpt-apply-btn:hover { background: var(--theme-elevation-300); }
      `}</style>
      {children}
    </>
  )
}
