'use client'
import React, { useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

type Phase = 'idle' | 'composing' | 'sending' | 'done' | 'error'

/**
 * Shown on a CourseSchedule document.
 * Lets an admin compose and send an email to all confirmed/waitlisted
 * attendees for this session without leaving the CMS.
 */
export default function EmailAttendeesButton() {
  const { id } = useDocumentInfo()

  const [phase, setPhase]     = useState<Phase>('idle')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [feedback, setFeedback] = useState('')

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
      const json = await res.json() as { sent?: number; failed?: number; errors?: string[]; error?: string }
      if (res.ok) {
        const failNote = json.failed ? ` (${json.failed} failed)` : ''
        setFeedback(`✓ Sent to ${json.sent} attendee${(json.sent ?? 0) === 1 ? '' : 's'}${failNote}.`)
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

  // ── Styles ────────────────────────────────────────────────────────────────

  const containerStyle: React.CSSProperties = {
    padding: '12px 0',
    borderBottom: '1px solid var(--theme-elevation-100)',
    marginBottom: 'var(--base)',
  }

  const btnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 18px',
    borderRadius: 'var(--style-radius-s)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid',
  }

  const primaryBtn: React.CSSProperties = {
    ...btnBase,
    background: '#dbeafe',
    borderColor: '#93c5fd',
    color: '#1e40af',
  }

  const ghostBtn: React.CSSProperties = {
    ...btnBase,
    background: 'transparent',
    borderColor: 'var(--theme-elevation-250)',
    color: 'var(--theme-text)',
  }

  const sendBtn: React.CSSProperties = {
    ...btnBase,
    background: phase === 'sending' ? 'var(--theme-elevation-150)' : '#dbeafe',
    borderColor: '#93c5fd',
    color: '#1e40af',
    cursor: phase === 'sending' ? 'not-allowed' : 'pointer',
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={containerStyle}>
      {phase === 'idle' && (
        <button type="button" onClick={open} style={primaryBtn}>
          ✉ Email Attendees
        </button>
      )}

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
            <p style={{ margin: 0, fontSize: '12px', color: phase === 'error' ? '#991b1b' : '#065f46' }}>
              {feedback}
            </p>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={send} disabled={phase === 'sending'} style={sendBtn}>
              {phase === 'sending' ? 'Sending…' : 'Send'}
            </button>
            <button type="button" onClick={close} disabled={phase === 'sending'} style={ghostBtn}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#065f46', fontWeight: 500 }}>{feedback}</span>
          <button type="button" onClick={close} style={ghostBtn}>
            Close
          </button>
        </div>
      )}
    </div>
  )
}
