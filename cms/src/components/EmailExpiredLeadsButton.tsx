'use client'
import React, { useState } from 'react'

type Phase = 'idle' | 'composing' | 'sending' | 'done' | 'error'

const IconEmail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
)

/**
 * Shown above the Pending Bookings list.
 * Lets an admin compose and send a marketing/promotional email to all
 * visitors who started checkout but never completed payment (Expired status).
 */
export default function EmailExpiredLeadsButton() {
  const [phase, setPhase]       = useState<Phase>('idle')
  const [subject, setSubject]   = useState('')
  const [message, setMessage]   = useState('')
  const [feedback, setFeedback] = useState('')

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
      const res = await fetch('/api/pending-bookings/email-expired', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      })
      const json = await res.json() as { sent?: number; failed?: number; errors?: string[]; error?: string }
      if (res.ok) {
        const failNote = json.failed ? ` (${json.failed} could not be delivered)` : ''
        setFeedback(`Sent to ${json.sent} unique address${(json.sent ?? 0) === 1 ? '' : 'es'}${failNote}.`)
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '10px 0 14px',
        borderBottom: '1px solid var(--theme-elevation-100)',
        marginBottom: 'var(--base)',
      }}
    >
      {phase === 'idle' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button type="button" onClick={open} className="roster-btn">
            <span className="roster-btn__icon"><IconEmail /></span>
            Email Expired Leads
          </button>
          <span style={{ fontSize: '12px', color: 'var(--theme-elevation-500)' }}>
            Sends a promotional email to all visitors who started checkout but never paid.
          </span>
        </div>
      )}

      {(phase === 'composing' || phase === 'sending' || phase === 'error') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '560px' }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--theme-text)' }}>
            Email All Expired Leads
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--theme-elevation-700)' }}>
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Still interested? Spots are filling up!"
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
              placeholder="Write your promotional message here…"
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

      {phase === 'done' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: '#065f46', fontWeight: 500 }}>✓ {feedback}</span>
          <button type="button" onClick={close} style={ghostBtn}>Close</button>
        </div>
      )}
    </div>
  )
}
