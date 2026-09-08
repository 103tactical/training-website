'use client'
import React, { useState } from 'react'
import { useFormFields, useDocumentInfo } from '@payloadcms/ui'

/**
 * Decision panel for a Pending Booking whose payment arrived under an email
 * that already holds a seat in the session (status "duplicate"). Two ways
 * out, each behind a plain-language confirm modal:
 *   • Refund — full amount back to the card via Square, record → Refunded,
 *     payer emailed.
 *   • Seat them — a NEW attendee (under their own email if they have one)
 *     plus the booking for this payment, record → Completed, the usual
 *     confirmation/enrollment emails sent.
 * On a "refunded" record it renders a short closed-out note instead.
 */

const SESSION_EXPIRED =
  'Your admin session has expired. Log in again (in a new tab is fine), then come back and try once more.'

export default function DuplicatePaymentPanel() {
  const { id } = useDocumentInfo()
  const status = useFormFields(([fields]) => fields.status?.value as string | undefined)
  const email = useFormFields(([fields]) => fields.email?.value as string | undefined)
  const firstName = useFormFields(([fields]) => fields.firstName?.value as string | undefined)
  const lastName = useFormFields(([fields]) => fields.lastName?.value as string | undefined)
  const amountCents = useFormFields(([fields]) => fields.amountPaidCents?.value as number | undefined)

  const [modal, setModal] = useState<'refund' | 'seat' | null>(null)
  const [seatEmail, setSeatEmail] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  if (!id) return null
  if (status !== 'duplicate' && status !== 'refunded') return null

  const name = `${firstName ?? ''} ${lastName ?? ''}`.trim() || email || 'this person'
  const amount = typeof amountCents === 'number' ? `$${(amountCents / 100).toFixed(2)}` : 'the payment'

  if (status === 'refunded') {
    return (
      <div style={{ padding: '12px 16px', marginBottom: 'var(--base)', borderRadius: 'var(--style-radius-m)', background: 'var(--theme-elevation-50)', fontSize: '13px', lineHeight: 1.5 }}>
        <strong>Resolved — refunded.</strong> This duplicate payment was returned to the card. Details are in the notes below. Nothing further to do.
      </div>
    )
  }

  const openModal = (which: 'refund' | 'seat') => {
    setResult(null)
    setSeatEmail(email ?? '')
    setModal(which)
  }
  const closeModal = () => { if (!busy) setModal(null) }

  const run = async (which: 'refund' | 'seat') => {
    setBusy(true)
    try {
      const res = await fetch(`/api/pending-bookings/${id}/${which === 'refund' ? 'refund-duplicate' : 'seat-duplicate'}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(which === 'seat' ? { email: seatEmail.trim() } : {}),
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 401 || res.status === 403) {
        setResult({ ok: false, message: SESSION_EXPIRED })
      } else if (!res.ok) {
        setResult({ ok: false, message: json.error ?? 'Something went wrong. Check the server logs.' })
      } else if (which === 'refund') {
        setResult({
          ok: true,
          message: `${json.amountDollars ?? amount} refunded to their card. Email to the payer: ${json.email ?? 'sent'}. Refresh the page to see the updated status.`,
        })
      } else {
        const em = json.emails ?? {}
        setResult({
          ok: true,
          message:
            `Seated — Booking #${json.bookingId} (${json.status}) for ${name} <${json.seatEmail}>. ` +
            `Confirmation email: ${em.confirmation ?? 'not attempted'}. Enrollment email: ${em.enrollment ?? 'not attempted'}. Refresh the page to see the updated status.`,
        })
      }
    } catch {
      setResult({ ok: false, message: 'Network error. Please try again.' })
    } finally {
      setBusy(false)
      setModal(null)
    }
  }

  const btn = (bg: string, border: string, color: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px',
    background: bg, border: `1px solid ${border}`, borderRadius: 'var(--style-radius-s)',
    color, fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  })

  return (
    <div style={{ marginBottom: 'var(--base)' }}>
      <div style={{ padding: '14px 16px', borderRadius: 'var(--style-radius-m)', background: '#fffbeb', color: '#78350f', fontSize: '13px', lineHeight: 1.55 }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
          Duplicate payment — needs your decision
        </div>
        <div>
          <strong>{name}</strong> paid <strong>{amount}</strong> using <strong>{email}</strong>, but that email already
          holds a seat in this session, so no booking was created for this payment. The money is sitting in Square.
          The notes below explain what happened. Choose one:
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
          <button type="button" onClick={() => openModal('refund')} disabled={busy} style={btn('#fee2e2', '#fca5a5', '#991b1b')}>
            Refund {amount} to Their Card
          </button>
          <button type="button" onClick={() => openModal('seat')} disabled={busy} style={btn('#d1fae5', '#6ee7b7', '#065f46')}>
            Seat Them in This Session
          </button>
        </div>
        {result && (
          <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: 500, color: result.ok ? '#065f46' : '#991b1b' }}>
            {result.ok ? '✓' : '✗'} {result.message}
          </div>
        )}
      </div>

      {modal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--theme-elevation-0)', color: 'var(--theme-text)', borderRadius: 'var(--style-radius-m)', padding: '24px', maxWidth: '520px', width: '100%', fontSize: '14px', lineHeight: 1.55 }}
          >
            {modal === 'refund' ? (
              <>
                <h3 style={{ margin: '0 0 10px', fontSize: '17px' }}>Refund {amount} to {name}?</h3>
                <div style={{ padding: '10px 12px', borderRadius: 'var(--style-radius-s)', background: 'var(--theme-elevation-50)', marginBottom: '12px' }}>
                  <strong>{name}</strong> · {email}
                </div>
                <ul style={{ margin: '0 0 14px', paddingLeft: '20px' }}>
                  <li>Square returns the full <strong>{amount}</strong> to the card it was paid with (5–10 business days to appear).</li>
                  <li>They get an email explaining a second payment came in under an email that already had a seat, and that it was refunded.</li>
                  <li>The existing seat under this email is not touched.</li>
                  <li>Square keeps its processing fee on refunds — that part is not recoverable.</li>
                </ul>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button type="button" onClick={closeModal} disabled={busy} style={btn('var(--theme-elevation-100)', 'var(--theme-elevation-200)', 'var(--theme-text)')}>
                    Not Now
                  </button>
                  <button type="button" onClick={() => run('refund')} disabled={busy} style={btn('#b91c1c', '#b91c1c', '#fff')}>
                    {busy ? 'Refunding…' : `Yes — Refund ${amount}`}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ margin: '0 0 10px', fontSize: '17px' }}>Seat {name} in this session?</h3>
                <p style={{ margin: '0 0 10px' }}>
                  Use this when the payment was really for a second person (two people sharing one email), or you simply want to honor it.
                </p>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>Their email address</label>
                <input
                  type="email"
                  value={seatEmail}
                  onChange={(e) => setSeatEmail(e.target.value)}
                  disabled={busy}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '14px', border: '1px solid var(--theme-elevation-200)', borderRadius: 'var(--style-radius-s)', background: 'var(--theme-input-bg, var(--theme-elevation-0))', color: 'var(--theme-text)', marginBottom: '6px' }}
                />
                <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--theme-elevation-600)' }}>
                  If they have their own email, enter it so the confirmation and class details reach them. Keeping the shared address is fine too.
                </p>
                <ul style={{ margin: '0 0 14px', paddingLeft: '20px' }}>
                  <li>A new attendee and a booking for this payment are created ({amount}, already paid).</li>
                  <li>If the session is full they are waitlisted honestly, and told so.</li>
                  <li>They receive the confirmation email and any enrollment forms, the same as a normal booking.</li>
                </ul>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button type="button" onClick={closeModal} disabled={busy} style={btn('var(--theme-elevation-100)', 'var(--theme-elevation-200)', 'var(--theme-text)')}>
                    Not Now
                  </button>
                  <button type="button" onClick={() => run('seat')} disabled={busy || !seatEmail.trim()} style={btn('#047857', '#047857', '#fff')}>
                    {busy ? 'Booking…' : 'Yes — Book Them'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
