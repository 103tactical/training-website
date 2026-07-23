'use client'
/**
 * Shown BELOW the enrollment Message field on a Course — renders the fixed
 * closing of the enrollment email (attachment note + questions footer).
 */
import React from 'react'

const wrap: React.CSSProperties = {
  padding: '2px 14px 12px',
  background: 'var(--theme-elevation-50)',
  border: '1px solid var(--theme-elevation-150)',
  borderTop: 'none',
  borderRadius: '0 0 var(--style-radius-s, 4px) var(--style-radius-s, 4px)',
  fontSize: '12px',
  lineHeight: 1.6,
  color: 'var(--theme-elevation-500)',
}

export default function EnrollmentTemplateAfter() {
  return (
    <div style={{ marginTop: '-12px', marginBottom: '18px' }}>
      <div style={wrap}>
        <p style={{ margin: '0 0 8px', fontSize: '11px', color: 'var(--theme-elevation-400)' }}>
          ▲ Your message appears above ▲
        </p>
        <p style={{ margin: '0 0 8px', fontStyle: 'italic' }}>
          <strong>An enrollment document is attached.</strong><br />
          Please review it before your first day of class. If it includes a form,
          please complete it and bring it with you.
          <span style={{ color: 'var(--theme-elevation-400)' }}> (only when a document is uploaded below)</span>
        </p>
        <p style={{ margin: 0, fontStyle: 'italic' }}>
          Questions? Please call us at [phone from Site Settings].
        </p>
      </div>
    </div>
  )
}
