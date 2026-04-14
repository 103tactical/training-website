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

        /* Hide the clear (×) button on read-only / disabled date fields.
           Payload marks read-only date inputs as disabled, so we use :has()
           to detect a disabled input and hide the sibling close icon. */
        .react-datepicker-wrapper:has(input:disabled) ~ .react-datepicker__close-icon,
        .react-datepicker-wrapper:has(input[readonly]) ~ .react-datepicker__close-icon,
        .read-only .react-datepicker__close-icon,
        [class*="read-only"] .react-datepicker__close-icon { display: none !important; }
      `}</style>
      {children}
    </>
  )
}
