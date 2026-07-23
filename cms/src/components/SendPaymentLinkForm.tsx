'use client'
/**
 * "Send Payment Link" — rendered inside the RosterActionsBar on a
 * CourseSchedule. Admin enters name + email (+ optional phone); the server
 * creates a tokenized PendingBooking, generates a tracked Square payment
 * link priced identically to the website (course price + card surcharge),
 * and emails the person a branded pay button. Payment then flows through
 * the standard webhook: attendee, booking, seat, accounting — automatic.
 */
import React, { useEffect, useState } from 'react'

type Phase = 'idle' | 'composing' | 'sending' | 'done' | 'error'

interface PendingLink {
  id: number
  name: string | null
  email: string
  sentAt: string
}

export default function SendPaymentLinkForm({ scheduleId }: { scheduleId: number | string }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [feedback, setFeedback] = useState('')
  const [resultUrl, setResultUrl] = useState('')
  const [resultTotal, setResultTotal] = useState('')
  const [outstanding, setOutstanding] = useState<PendingLink[]>([])
  const [copied, setCopied] = useState(false)

  const loadOutstanding = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/course-schedules/${scheduleId}/outstanding-links`, {
        credentials: 'include',
      })
      if (res.ok) {
        const json = await res.json() as { pending: PendingLink[] }
        setOutstanding(json.pending ?? [])
      }
    } catch { /* non-fatal */ }
  }, [scheduleId])

  useEffect(() => { loadOutstanding() }, [loadOutstanding])

  const close = () => {
    setPhase('idle'); setFirstName(''); setLastName(''); setEmail(''); setPhone('')
    setFeedback(''); setResultUrl(''); setResultTotal(''); setCopied(false)
  }

  const send = async () => {
    if (!firstName.trim() || !lastName.trim()) { setFeedback('First and last name are required.'); return }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFeedback('A valid email address is required.'); return
    }
    setPhase('sending'); setFeedback('')
    try {
      const res = await fetch(`/api/course-schedules/${scheduleId}/send-payment-link`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
        }),
      })
      const json = await res.json() as {
        checkoutUrl?: string; totalCents?: number; emailSent?: boolean; emailError?: string; error?: string
      }
      if (res.ok && json.checkoutUrl) {
        setResultUrl(json.checkoutUrl)
        setResultTotal(json.totalCents != null ? `$${(json.totalCents / 100).toFixed(2)}` : '')
        if (json.emailSent) {
          setFeedback(`Payment link emailed to ${email.trim()}.`)
        } else {
          setFeedback(`Link created but the email failed (${json.emailError ?? 'unknown error'}). Copy the link below and send it yourself.`)
        }
        setPhase('done')
        loadOutstanding()
      } else {
        setFeedback(json.error ?? 'Failed to create the payment link.')
        setPhase('error')
      }
    } catch {
      setFeedback('Network error. Please try again.')
      setPhase('error')
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(resultUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px',
    border: '1px solid var(--theme-elevation-250)',
    borderRadius: 'var(--style-radius-s)',
    background: 'var(--theme-input-bg)',
    color: 'var(--theme-text)', fontSize: '13px', boxSizing: 'border-box',
  }
  const ghostBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', padding: '9px 18px',
    borderRadius: 'var(--style-radius-s)', fontSize: '13px', fontWeight: 600,
    cursor: 'pointer', border: '1px solid var(--theme-elevation-250)',
    background: 'transparent', color: 'var(--theme-text)',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--theme-elevation-700)',
  }

  return (
    <>

      {phase === 'idle' && (
        <>
          <button type="button" onClick={() => setPhase('composing')} className="roster-btn">
            <span className="roster-btn__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </span>
            Send Payment Link
          </button>
          {outstanding.length > 0 && (
            <div style={{
              flexBasis: '100%',
              marginTop: '2px',
              padding: '8px 12px',
              background: 'var(--theme-elevation-50)',
              border: '1px solid var(--theme-elevation-150)',
              borderRadius: 'var(--style-radius-s, 4px)',
              fontSize: '12px',
              color: 'var(--theme-elevation-600)',
              maxWidth: '560px',
            }}>
              <strong style={{ color: 'var(--theme-text)' }}>
                {outstanding.length} payment link{outstanding.length === 1 ? '' : 's'} awaiting payment
              </strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                {outstanding.map((o) => (
                  <li key={o.id}>
                    {o.name ?? o.email}{o.name ? ` — ${o.email}` : ''} · sent {new Date(o.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {(phase === 'composing' || phase === 'sending' || phase === 'error') && (
        <div style={{ flexBasis: '100%', display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '560px' }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--theme-text)' }}>
            Send Payment Link
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--theme-elevation-600)', lineHeight: 1.5 }}>
            They&apos;ll receive an email with a secure Square payment button, priced the same
            as a website booking (course price + card fee). Once they pay, their booking,
            seat, and accounting are recorded automatically — nothing else to enter.
          </p>

          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>First Name *</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inputStyle} disabled={phase === 'sending'} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Last Name *</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} style={inputStyle} disabled={phase === 'sending'} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} disabled={phase === 'sending'} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Phone (optional)</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} disabled={phase === 'sending'} />
            </div>
          </div>

          {feedback && (
            <p style={{ margin: 0, fontSize: '12px', color: '#991b1b' }}>{feedback}</p>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={send}
              disabled={phase === 'sending'}
              className="roster-btn"
              style={{ opacity: phase === 'sending' ? 0.55 : 1, cursor: phase === 'sending' ? 'not-allowed' : 'pointer' }}
            >
              {phase === 'sending' ? 'Sending…' : 'Send Link'}
            </button>
            <button type="button" onClick={close} disabled={phase === 'sending'} style={ghostBtn}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div style={{ flexBasis: '100%', display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '560px' }}>
          <span style={{ fontSize: '13px', color: '#065f46', fontWeight: 500 }}>✓ {feedback}</span>
          {resultTotal && (
            <span style={{ fontSize: '12px', color: 'var(--theme-elevation-600)' }}>
              Amount due: {resultTotal}
            </span>
          )}
          {resultUrl && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="text" readOnly value={resultUrl} style={{ ...inputStyle, flex: 1, minWidth: '260px', fontSize: '12px' }} onFocus={(e) => e.target.select()} />
              <button type="button" onClick={copyLink} style={ghostBtn}>{copied ? 'Copied ✓' : 'Copy Link'}</button>
            </div>
          )}
          <div>
            <button type="button" onClick={close} style={ghostBtn}>Done</button>
          </div>
        </div>
      )}

    </>
  )
}
