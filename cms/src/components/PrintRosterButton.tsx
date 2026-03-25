'use client'
import React from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

/**
 * Shown on the CourseSchedules detail page.
 * Opens the print-friendly roster for the current session in a new tab.
 */
export default function PrintRosterButton() {
  const { id } = useDocumentInfo()

  if (!id) return null

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? ''
  const token  = process.env.NEXT_PUBLIC_PRINT_SECRET ?? ''
  const query  = token ? `?token=${token}` : ''
  const href   = `${webUrl}/print/roster/${id}${query}`

  return (
    <div style={{ padding: '0 0 var(--base)' }}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 18px',
          background: 'var(--theme-elevation-100)',
          border: '1px solid var(--theme-elevation-250)',
          borderRadius: 'var(--style-radius-s)',
          color: 'var(--theme-text)',
          textDecoration: 'none',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        <span aria-hidden="true">🖨</span> Print Roster
      </a>
    </div>
  )
}
