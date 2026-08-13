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
  phone: string | null
  sentAt: string
  url: string | null
  totalCents: number | null
  /** true when we hold Square's link ID, so cancelling also disables the link at Square */
  canDisable: boolean
}

export default function SendPaymentLinkForm({ scheduleId }: { scheduleId: number | string }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [discountCode, setDiscountCode] = useState('')
  const [feedback, setFeedback] = useState('')
  const [resultUrl, setResultUrl] = useState('')
  const [resultTotal, setResultTotal] = useState('')
  const [outstanding, setOutstanding] = useState<PendingLink[]>([])
  const [copied, setCopied] = useState(false)
  const [copiedRowId, setCopiedRowId] = useState<number | null>(null)
  const [modalRow, setModalRow] = useState<PendingLink | null>(null)
  const [modalCopied, setModalCopied] = useState(false)
  const [resendingRowId, setResendingRowId] = useState<number | null>(null)
  const [resentRowId, setResentRowId] = useState<number | null>(null)
  const [resendError, setResendError] = useState('')
  // "Cancel & Release Seat" modal state
  const [cancelRow, setCancelRow] = useState<PendingLink | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelNotice, setCancelNotice] = useState('')

  /** First name for the modal copy ("Jane"); falls back to "this person" */
  const rowFirstName = (row: PendingLink): string =>
    row.name ? row.name.trim().split(/\s+/)[0] : 'this person'

  const formatRowPhone = (digits: string): string =>
    digits.length === 10
      ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
      : digits

  // Copying goes through a modal that previews WHOSE link it is: these links
  // are identity-bound (paying one books THAT person, not the payer), so a
  // link copied off the wrong row and texted to the wrong customer books the
  // wrong attendee. Nothing lands on the clipboard until the modal confirm.
  const confirmCopyLink = async (row: PendingLink) => {
    if (!row.url) return
    try {
      await navigator.clipboard.writeText(row.url)
      setModalCopied(true)
      setCopiedRowId(row.id)
      setTimeout(() => setCopiedRowId((cur) => (cur === row.id ? null : cur)), 2500)
      setTimeout(() => { setModalRow(null); setModalCopied(false) }, 1100)
    } catch { /* clipboard unavailable */ }
  }

  const closeModal = React.useCallback(() => {
    setModalRow(null)
    setModalCopied(false)
  }, [])

  const closeCancelModal = React.useCallback(() => {
    if (cancelling) return // never close mid-request — the result matters
    setCancelRow(null)
  }, [cancelling])

  // Esc closes whichever modal is open
  useEffect(() => {
    if (!modalRow && !cancelRow) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeModal(); closeCancelModal() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalRow, cancelRow, closeModal, closeCancelModal])

  const confirmCancelLink = async (row: PendingLink) => {
    if (cancelling) return
    setCancelling(true)
    setCancelNotice('')
    setResendError('')
    try {
      const res = await fetch(`/api/pending-bookings/${row.id}/cancel-link`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.status === 401 || res.status === 403) {
        setCancelRow(null)
        setResendError('Your login session has expired — please log in again, then retry the cancel.')
        return
      }
      const json = await res.json() as {
        ok?: boolean; linkDisabled?: boolean; hadLinkId?: boolean; error?: string
      }
      if (res.ok && json.ok) {
        setCancelRow(null)
        setCancelNotice(
          json.linkDisabled
            ? `Cancelled — ${rowFirstName(row)}’s payment link no longer works and the seat is back on sale.`
            : `Cancelled — the seat is back on sale. Heads up: Square didn’t confirm disabling the link itself, so if ${rowFirstName(row)} still pays it you’ll get an alert email and nothing is lost.`,
        )
        loadOutstanding()
      } else {
        setCancelRow(null)
        setResendError(json.error ?? 'Could not cancel the link — please try again.')
      }
    } catch {
      setCancelRow(null)
      setResendError('Network error — please try again.')
    } finally {
      setCancelling(false)
    }
  }

  const resendRowLink = async (row: PendingLink) => {
    if (resendingRowId !== null) return
    setResendingRowId(row.id)
    setResendError('')
    try {
      const res = await fetch(`/api/pending-bookings/${row.id}/resend-link`, {
        method: 'POST',
        credentials: 'include',
      })
      const json = await res.json() as { emailSent?: boolean; emailError?: string; error?: string }
      if (res.ok && json.emailSent) {
        setResentRowId(row.id)
        setTimeout(() => setResentRowId((cur) => (cur === row.id ? null : cur)), 2500)
        loadOutstanding() // refresh "sent" dates
      } else {
        setResendError(json.error ?? json.emailError ?? 'Could not resend the email.')
      }
    } catch {
      setResendError('Network error — please try again.')
    } finally {
      setResendingRowId(null)
    }
  }

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
    setPhase('idle'); setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setDiscountCode('')
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
          discountCode: discountCode.trim() || undefined,
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
            Add Attendee via Payment Link
          </button>
          {/* Cancel confirmation lives OUTSIDE the awaiting box: cancelling
              the LAST link unmounts the box, and the reassurance must
              survive that (found in live testing 2026-08-13) */}
          {cancelNotice && outstanding.length === 0 && (
            <p style={{ flexBasis: '100%', margin: '4px 0 0', fontSize: '12px', color: '#065f46' }}>
              {cancelNotice}
            </p>
          )}
          {resendError && outstanding.length === 0 && (
            <p style={{ flexBasis: '100%', margin: '4px 0 0', fontSize: '12px', color: '#991b1b' }}>
              {resendError}
            </p>
          )}
          {outstanding.length > 0 && (
            // Outer div owns the flex line-break (basis 100%, no max-width —
            // a max-width here would clamp the basis and let the box sit
            // inline beside the buttons on wide screens)
            <div style={{ flexBasis: '100%', minWidth: '100%' }}>
            {/* Row layout: person info grows/wraps (min 240px before the
                actions drop below it), the action buttons hug the right on
                wide screens and wrap onto their own left-aligned line on
                narrow ones — each button can wrap independently on phones.
                Box cap sized so name + email + three buttons fit one line
                on desktop (the old 720px cap forced awkward wrapping). */}
            <style>{`
              .apl-box {
                margin-top: 2px;
                padding: 10px 14px;
                background: var(--theme-elevation-50);
                border: 1px solid var(--theme-elevation-150);
                border-radius: var(--style-radius-s, 4px);
                font-size: 12px;
                color: var(--theme-elevation-600);
                width: 100%;
                max-width: 960px;
                box-sizing: border-box;
              }
              .apl-rows { margin: 6px 0 0; padding: 0; list-style: none; }
              .apl-row {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                column-gap: 10px;
                row-gap: 6px;
                padding: 4px 0;
              }
              .apl-meta {
                flex: 1 1 240px;
                min-width: 0;
                overflow-wrap: anywhere;
              }
              .apl-actions {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 8px;
                margin-left: auto;
              }
              /* When the actions wrap to their own line, left-align them
                 under the name instead of floating detached on the right */
              @media (max-width: 700px) {
                .apl-actions { margin-left: 0; width: 100%; }
              }
            `}</style>
            <div className="apl-box">
              <strong style={{ color: 'var(--theme-text)' }}>
                Awaiting payment from {outstanding.length} {outstanding.length === 1 ? 'person' : 'people'}
              </strong>
              <span style={{ marginLeft: '6px', color: 'var(--theme-elevation-500)' }}>
                — each is holding a seat
              </span>
              {resendError && (
                <p style={{ margin: '4px 0 0', color: '#991b1b' }}>{resendError}</p>
              )}
              {cancelNotice && (
                <p style={{ margin: '4px 0 0', color: '#065f46' }}>{cancelNotice}</p>
              )}
              <ul className="apl-rows">
                {outstanding.map((o) => (
                  <li key={o.id} className="apl-row">
                      <span className="apl-meta">
                        {o.name ?? o.email}{o.name ? ` — ${o.email}` : ''} · sent {new Date(o.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="apl-actions">
                      {o.url && (
                        <button
                          type="button"
                          onClick={() => setModalRow(o)}
                          style={{
                            padding: '1px 8px',
                            borderRadius: 'var(--style-radius-s, 4px)',
                            border: '1px solid var(--theme-elevation-250)',
                            background: 'transparent',
                            color: copiedRowId === o.id ? '#065f46' : 'var(--theme-text)',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {copiedRowId === o.id ? 'Copied ✓' : 'Copy Payment Link'}
                        </button>
                      )}
                      {o.url && (
                        <button
                          type="button"
                          onClick={() => resendRowLink(o)}
                          disabled={resendingRowId !== null}
                          style={{
                            padding: '1px 8px',
                            borderRadius: 'var(--style-radius-s, 4px)',
                            border: '1px solid var(--theme-elevation-250)',
                            background: 'transparent',
                            color: resentRowId === o.id ? '#065f46' : 'var(--theme-text)',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: resendingRowId !== null ? 'wait' : 'pointer',
                            whiteSpace: 'nowrap',
                            opacity: resendingRowId !== null && resendingRowId !== o.id ? 0.5 : 1,
                          }}
                        >
                          {resendingRowId === o.id ? 'Sending…' : resentRowId === o.id ? 'Sent ✓' : 'Resend Email'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setCancelRow(o)}
                        style={{
                          padding: '1px 8px',
                          borderRadius: 'var(--style-radius-s, 4px)',
                          border: '1px solid rgba(153, 27, 27, 0.45)',
                          background: 'transparent',
                          color: '#b91c1c',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Cancel &amp; Release Seat
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            </div>
          )}
        </>
      )}

      {(phase === 'composing' || phase === 'sending' || phase === 'error') && (
        <div style={{ flexBasis: '100%', minWidth: '100%', display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '560px' }}>
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Discount Code (optional)</label>
              <input
                type="text"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                style={inputStyle}
                disabled={phase === 'sending'}
                placeholder="e.g. VET10"
              />
            </div>
            <div style={{ flex: 1 }} />
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
        </div>
      )}

      {phase === 'done' && (
        <div style={{ flexBasis: '100%', minWidth: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '560px' }}>
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
        </div>
      )}

      {/* ── Copy Payment Link modal ──────────────────────────────────────────
          Links are identity-bound: whoever pays one enrolls the person it was
          created for, NOT the payer. The modal previews exactly whose link is
          about to be copied so it can't be texted to the wrong customer. */}
      {modalRow && (
        <div
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-label="Copy payment link"
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--theme-bg)',
              borderRadius: 'var(--style-radius-m, 8px)',
              padding: '28px',
              width: '100%',
              maxWidth: '440px',
              boxSizing: 'border-box',
            }}
          >
            <p style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 700, color: 'var(--theme-text)' }}>
              Copy Payment Link
            </p>

            {/* Whose link this is */}
            <div style={{
              background: 'var(--theme-elevation-50)',
              borderRadius: 'var(--style-radius-s, 4px)',
              padding: '14px 16px',
              marginBottom: '16px',
            }}>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--theme-text)' }}>
                {modalRow.name ?? modalRow.email}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--theme-elevation-600)' }}>
                {modalRow.email}
                {modalRow.phone ? ` · ${formatRowPhone(modalRow.phone)}` : ''}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--theme-elevation-600)' }}>
                {modalRow.totalCents != null ? `Link total: $${(modalRow.totalCents / 100).toFixed(2)} · ` : ''}
                Link emailed {new Date(modalRow.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>

            <p style={{ margin: '0 0 10px', fontSize: '13px', lineHeight: 1.6, color: 'var(--theme-text)' }}>
              This copies <strong>{rowFirstName(modalRow)}&rsquo;s</strong> personal payment link so you
              can send it another way — like a text message — if the email isn&rsquo;t reaching them.
            </p>
            <p style={{ margin: '0 0 22px', fontSize: '13px', lineHeight: 1.6, color: 'var(--theme-text)' }}>
              <strong>Only send this link to {rowFirstName(modalRow)}.</strong> Whoever pays it enrolls{' '}
              {rowFirstName(modalRow)} — not the person paying.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={closeModal} style={ghostBtn}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmCopyLink(modalRow)}
                disabled={modalCopied}
                style={{
                  display: 'inline-flex', alignItems: 'center', padding: '9px 18px',
                  borderRadius: 'var(--style-radius-s)', fontSize: '13px', fontWeight: 600,
                  cursor: modalCopied ? 'default' : 'pointer', border: 'none',
                  background: modalCopied ? '#065f46' : '#ea580c', color: '#ffffff',
                }}
              >
                {modalCopied ? 'Copied ✓' : `Copy ${rowFirstName(modalRow) === 'this person' ? 'the' : `${rowFirstName(modalRow)}’s`} Link`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel & Release Seat modal ──────────────────────────────────────
          Plain-language safety stop before cancelling an outstanding payment
          link: says exactly what will happen (link disabled at Square, seat
          released, no email sent) so the click is never a surprise. */}
      {cancelRow && (
        <div
          onClick={closeCancelModal}
          role="dialog"
          aria-modal="true"
          aria-label="Cancel payment link"
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--theme-bg)',
              borderRadius: 'var(--style-radius-m, 8px)',
              padding: '28px',
              width: '100%',
              maxWidth: '460px',
              boxSizing: 'border-box',
            }}
          >
            <p style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 700, color: 'var(--theme-text)' }}>
              Cancel this payment link?
            </p>

            {/* Whose link is being cancelled */}
            <div style={{
              background: 'var(--theme-elevation-50)',
              borderRadius: 'var(--style-radius-s, 4px)',
              padding: '14px 16px',
              marginBottom: '16px',
            }}>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--theme-text)' }}>
                {cancelRow.name ?? cancelRow.email}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--theme-elevation-600)' }}>
                {cancelRow.email}
                {cancelRow.phone ? ` · ${formatRowPhone(cancelRow.phone)}` : ''}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--theme-elevation-600)' }}>
                {cancelRow.totalCents != null ? `Link total: $${(cancelRow.totalCents / 100).toFixed(2)} · ` : ''}
                Link emailed {new Date(cancelRow.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>

            <p style={{ margin: '0 0 6px', fontSize: '13px', lineHeight: 1.6, color: 'var(--theme-text)' }}>
              Here&rsquo;s what happens:
            </p>
            <ul style={{ margin: '0 0 14px', paddingLeft: '20px', fontSize: '13px', lineHeight: 1.7, color: 'var(--theme-text)' }}>
              <li>
                {cancelRow.canDisable ? (
                  <>The payment link {rowFirstName(cancelRow)} received <strong>stops working</strong> — nobody can pay it anymore.</>
                ) : (
                  <>This link was sent before link-cancelling existed, so the link itself <strong>may still open</strong>. If {rowFirstName(cancelRow)} pays it anyway, you&rsquo;ll get an alert email and no money is lost.</>
                )}
              </li>
              <li>The seat being held for {rowFirstName(cancelRow)} goes <strong>back on sale</strong> right away.</li>
              <li><strong>No email is sent</strong> — if you told {rowFirstName(cancelRow)} to expect the link, let them know it&rsquo;s cancelled.</li>
            </ul>
            <p style={{ margin: '0 0 22px', fontSize: '13px', lineHeight: 1.6, color: 'var(--theme-elevation-600)' }}>
              Nothing else changes — {rowFirstName(cancelRow)} has no booking yet, and you can always send a fresh link later.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={closeCancelModal} disabled={cancelling} style={ghostBtn}>
                Keep the Link
              </button>
              <button
                type="button"
                onClick={() => confirmCancelLink(cancelRow)}
                disabled={cancelling}
                style={{
                  display: 'inline-flex', alignItems: 'center', padding: '9px 18px',
                  borderRadius: 'var(--style-radius-s)', fontSize: '13px', fontWeight: 600,
                  cursor: cancelling ? 'wait' : 'pointer', border: 'none',
                  background: '#b91c1c', color: '#ffffff',
                  opacity: cancelling ? 0.7 : 1,
                }}
              >
                {cancelling ? 'Cancelling…' : 'Yes — Cancel & Release the Seat'}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}
