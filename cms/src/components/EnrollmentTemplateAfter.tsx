'use client'
/**
 * Shown BELOW the enrollment Message field on a Course — the fixed closing
 * of the email. The attachment note is clearly marked as conditional on a
 * document being uploaded in the field below.
 */
import React from 'react'

export default function EnrollmentTemplateAfter() {
  return (
    <div style={{ marginTop: '-10px', marginBottom: '20px' }}>
      <p style={{
        margin: '0 0 4px', fontSize: '11px', fontWeight: 600,
        color: 'var(--theme-text)', opacity: 0.65, textAlign: 'center',
      }}>
        ▲ your message ends here ▲
      </p>

      {/* Conditional block — only sent when a document is uploaded */}
      <div style={{
        padding: '10px 14px',
        background: 'rgba(234, 88, 12, 0.08)',
        border: '1px dashed #ea580c',
        borderRadius: 'var(--style-radius-s, 4px)',
        fontSize: '13px', lineHeight: 1.6,
        color: 'var(--theme-text)',
      }}>
        <p style={{
          margin: '0 0 8px', fontSize: '10.5px', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ea580c',
        }}>
          Included only when an Enrollment Document is uploaded below
        </p>
        <p style={{ margin: 0 }}>
          <strong>An enrollment document is attached.</strong><br />
          Please review it before your first day of class. If it includes a form,
          please complete it and bring it with you.
        </p>
      </div>

      {/* Always included */}
      <div style={{
        padding: '10px 14px', marginTop: '6px',
        background: 'var(--theme-elevation-100)',
        borderRadius: '0 0 var(--style-radius-s, 4px) var(--style-radius-s, 4px)',
        fontSize: '13px', lineHeight: 1.6,
        color: 'var(--theme-text)',
      }}>
        <p style={{ margin: 0 }}>
          Questions? Please call us at <strong><em>[phone number from Site Settings]</em></strong>.
        </p>
      </div>
    </div>
  )
}
