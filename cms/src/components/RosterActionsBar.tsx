'use client'
import React, { useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

type Phase = 'idle' | 'composing' | 'sending' | 'done' | 'error'

/**
 * Rendered inside the Attendee Roster section of a CourseSchedule.
 * Shows a Print Roster link and an Email Attendees compose form side by side,
 * both styled with the shared `.roster-btn` orange class from AdminStyles.tsx.
 */
export default function RosterActionsBar() {
  const { id } = useDocumentInfo()

  const [phase, setPhase]       = useState<Phase>('idle')
  const [subject, setSubject]   = useState('')
  const [message, setMessage]   = useState('')
  const [feedback, setFeedback] = useState('')

  const webUrl  = process.env.NEXT_PUBLIC_WEB_URL ?? ''
  const token   = process.env.NEXT_PUBLIC_PRINT_SECRET ?? ''
  const query   = token ? `?token=${token}` : ''
  const printHref = id ? `${webUrl}/print/roster/${id}${query}` : null

  if (!id) return null

  const open  = () => setPhase('composing')
  const close = () => { setPhase('idle'); setSubject(''); setMessage(''); setFeedback('') }

  const send = async () => {
    if (!subject.trim() || !message.trim()) {
      setFeedback('Subject and message are both required.')
      return
    }
    setPhase('sending')
    setFeedback('')
    try {
      const res = await fetch(`/api/course-schedules/${id}/email-attendees`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      })
      const json = await res.json() as { sent?: number; failed?: number; error?: string }
      if (res.ok) {
        const failNote = json.failed ? ` (${json.failed} failed)` : ''
        setFeedback(`Sent to ${json.sent} attendee${(json.sent ?? 0) === 1 ? '' : 's'}${failNote}.`)
        setPhase('done')
      } else {
        setFeedback(json.error ?? 'Send failed. Check server logs.')
        setPhase('error')
      }
    } catch {
      setFeedback('Network error. Please try again.')
      setPhase('error')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid var(--theme-elevation-250)',
    borderRadius: 'var(--style-radius-s)',
    background: 'var(--theme-input-bg)',
    color: 'var(--theme-text)',
    fontSize: '13px',
    boxSizing: 'border-box',
  }

  const ghostBtn: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '9px 18px',
    borderRadius: 'var(--style-radius-s)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid var(--theme-elevation-250)',
    background: 'transparent',
    color: 'var(--theme-text)',
  }

  return (
    <div style={{ paddingBottom: 'var(--base)' }}>

      {/* ── Button row ────────────────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {printHref && (
            <a
              href={printHref}
              target="_blank"
              rel="noopener noreferrer"
              className="roster-btn"
            >
              <span className="roster-btn__icon" aria-hidden="true">🖨</span>
              Print Roster
            </a>
          )}
          <button type="button" onClick={open} className="roster-btn">
            <span className="roster-btn__icon" aria-hidden="true">✉</span>
            Email Attendees
          </button>
        </div>
      )}

      {/* ── Compose form ──────────────────────────────────────────────────── */}
      {(phase === 'composing' || phase === 'sending' || phase === 'error') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '560px' }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--theme-text)' }}>
            Email Confirmed &amp; Waitlisted Attendees
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--theme-elevation-700)' }}>
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Important update about your upcoming class"
              style={inputStyle}
              disabled={phase === 'sending'}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--theme-elevation-700)' }}>
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message here…"
              rows={6}
              style={{ ...inputStyle, resize: 'vertical' }}
              disabled={phase === 'sending'}
            />
          </div>

          {feedback && (
            <p style={{ margin: 0, fontSize: '12px', color: '#991b1b' }}>
              {feedback}
            </p>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={send}
              disabled={phase === 'sending'}
              className="roster-btn"
              style={{ opacity: phase === 'sending' ? 0.55 : 1, cursor: phase === 'sending' ? 'not-allowed' : 'pointer' }}
            >
              {phase === 'sending' ? 'Sending…' : 'Send'}
            </button>
            <button type="button" onClick={close} disabled={phase === 'sending'} style={ghostBtn}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Success state ─────────────────────────────────────────────────── */}
      {phase === 'done' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: '#065f46', fontWeight: 500 }}>✓ {feedback}</span>
          <button type="button" onClick={close} style={ghostBtn}>Close</button>
        </div>
      )}

    </div>
  )
}
