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

        /* ── Nav group spacing ─────────────────────────────────────────────── */
        .nav-group { padding-bottom: 24px !important; margin-bottom: 0 !important; }

        /* ── Dashboard link at the top of the nav ──────────────────────────── */
        .nav-group--dashboard-link { padding-bottom: 16px !important; }
        .nav-group--dashboard-link .nav__link-label {
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-size: 12px;
        }

        /* ── Admin dashboard cards ─────────────────────────────────────────── */
        .adash-card {
          display: block;
          padding: 10px 14px;
          border-radius: var(--style-radius-s, 4px);
          background: var(--theme-elevation-100);
          transition: background 0.12s;
          border: 1px solid var(--theme-elevation-200);
        }
        .adash-card:hover {
          background: var(--theme-elevation-150, var(--theme-elevation-200));
        }
        .adash-card__link {
          display: block;
          color: var(--theme-text);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
        }
        .adash-card__link:hover {
          color: var(--theme-text);
          text-decoration: underline;
        }
        .adash-card__info {
          margin-top: 4px;
        }
        .adash-card__info summary {
          list-style: none;
          cursor: pointer;
          font-size: 11px;
          color: var(--theme-elevation-500);
          user-select: none;
        }
        .adash-card__info summary::-webkit-details-marker { display: none; }
        .adash-card__info summary::before {
          content: 'ⓘ ';
        }
        .adash-card__info summary:hover {
          color: var(--theme-text);
        }
        .adash-card__info[open] summary {
          color: var(--theme-text);
        }
        .adash-card__info ul {
          margin: 6px 0 2px;
          padding-left: 16px;
          font-size: 12px;
          line-height: 1.5;
          color: var(--theme-elevation-600);
        }
        .adash-card__info li + li { margin-top: 3px; }

        /* ── Reporting page responsive grids ───────────────────────────────── */
        .rpt-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }
        .rpt-charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 28px;
        }
        .rpt-quick-links-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .rpt-table-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        @media (max-width: 900px) {
          .rpt-stat-grid        { grid-template-columns: repeat(2, 1fr); }
          .rpt-charts-grid      { grid-template-columns: 1fr; }
          .rpt-quick-links-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 520px) {
          .rpt-stat-grid        { grid-template-columns: 1fr; }
          .rpt-quick-links-grid { grid-template-columns: 1fr; }
        }

        /* ── Edit-view section legibility (2026-07-30) ──────────────────────
           Sections read as soft CARDS separated by surface + space + type —
           deliberately NO dividing lines and NO visible borders (existing
           1px border made transparent, not thickened, so layout is stable).
           Scoped to .collapsible-field > .collapsible = true page sections;
           array rows (Session Days, Transfer History) are untouched. */

        /* Card surface: gentle fill instead of an outline */
        .collapsible-field > .collapsible--style-default {
          border-color: transparent;
          background: var(--theme-elevation-50);
        }
        .collapsible-field > .collapsible--style-default:hover {
          border-color: transparent;
        }

        /* Section header: a clear landmark — slightly stronger surface,
           roomier padding, bolder title with a restrained orange accent */
        .collapsible-field > .collapsible > .collapsible__toggle-wrap {
          background: var(--theme-elevation-100);
          padding-top: 0.85rem;
          padding-bottom: 0.85rem;
        }
        .collapsible-field > .collapsible > .collapsible__toggle-wrap:not(.toggle-disabled):hover {
          background: var(--theme-elevation-150, var(--theme-elevation-100));
        }
        .collapsible-field > .collapsible .collapsible__row-label-wrap .row-label {
          font-weight: 700;
          color: var(--theme-text);
        }
        .collapsible-field > .collapsible .collapsible__indicator svg,
        .collapsible-field > .collapsible .collapsible__toggle-wrap .icon path {
          stroke: #ea580c;
        }

        /* Breathing room BETWEEN sections — grouping by proximity */
        .collapsible-field {
          margin-bottom: 1.75rem;
        }

        /* A little air inside the card so fields don't hug the header */
        .collapsible-field > .collapsible .collapsible__content {
          padding-top: 1.25rem;
        }
      `}</style>
      {children}
    </>
  )
}
