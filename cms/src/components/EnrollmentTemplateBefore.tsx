'use client'
/**
 * Shown ABOVE the enrollment Message field on a Course. Explains the feature,
 * then renders the fixed opening of the email so the admin sees exactly
 * where their message lands.
 */
import React from 'react'

export default function EnrollmentTemplateBefore() {
  return (
    <div style={{ marginBottom: 0 }}>
      <p style={{
        margin: '0 0 12px', fontSize: '13px', lineHeight: 1.55,
        color: 'var(--theme-text)',
      }}>
        Optional. When a message is entered below, this email is sent automatically to every
        attendee the moment their payment is confirmed. <strong>Type only your message</strong> —
        everything else shown in the preview is added for you.
      </p>

      <p style={{
        margin: '0 0 6px', fontSize: '11px', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        color: 'var(--theme-text)', opacity: 0.7,
      }}>
        Email preview
      </p>

      <div style={{
        padding: '12px 14px',
        background: 'var(--theme-elevation-100)',
        borderRadius: 'var(--style-radius-s, 4px) var(--style-radius-s, 4px) 0 0',
        fontSize: '13px', lineHeight: 1.6,
        color: 'var(--theme-text)',
      }}>
        <p style={{ margin: '0 0 8px' }}>Hi <em>[attendee&apos;s first name]</em>,</p>
        <p style={{ margin: 0 }}>
          Thank you for enrolling in <strong><em>[course title]</em></strong>. Please review the
          following information before your course date.
        </p>
      </div>
      <p style={{
        margin: '6px 0 4px', fontSize: '11px', fontWeight: 600,
        color: 'var(--theme-text)', opacity: 0.65, textAlign: 'center',
      }}>
        ▼ your message goes here ▼
      </p>
    </div>
  )
}
