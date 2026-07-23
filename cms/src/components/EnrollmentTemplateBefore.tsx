'use client'
/**
 * Shown ABOVE the enrollment Message field on a Course — renders the fixed
 * opening of the enrollment email so the admin sees exactly where their
 * message lands. The greyed text is supplied by the email template
 * automatically and cannot be edited here.
 */
import React from 'react'

const wrap: React.CSSProperties = {
  padding: '12px 14px 2px',
  background: 'var(--theme-elevation-50)',
  border: '1px solid var(--theme-elevation-150)',
  borderBottom: 'none',
  borderRadius: 'var(--style-radius-s, 4px) var(--style-radius-s, 4px) 0 0',
  fontSize: '12px',
  lineHeight: 1.6,
  color: 'var(--theme-elevation-500)',
}

export default function EnrollmentTemplateBefore() {
  return (
    <div style={{ marginBottom: 0 }}>
      <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--theme-elevation-600)' }}>
        Email preview — the grey text is added automatically
      </p>
      <div style={wrap}>
        <p style={{ margin: '0 0 8px', fontStyle: 'italic' }}>Hi [attendee's first name],</p>
        <p style={{ margin: '0 0 8px', fontStyle: 'italic' }}>
          Thank you for enrolling in <strong>[course title]</strong>. Please review the
          following information before your course date.
        </p>
        <p style={{ margin: 0, fontSize: '11px', color: 'var(--theme-elevation-400)' }}>
          ▼ Your message appears here ▼
        </p>
      </div>
    </div>
  )
}
