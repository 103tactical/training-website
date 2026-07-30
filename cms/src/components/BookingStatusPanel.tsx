'use client'
/**
 * Booking Status panel — replaces the raw status <select> + "skip refund"
 * checkbox with a guided, error-proof flow:
 *
 *   - shows the CURRENT status as a badge with a plain-English sentence
 *   - actions are explicit buttons ("Cancel this booking…", "Give them a
 *     seat"), never a bare dropdown with hidden side effects
 *   - cancelling asks HOW to handle the refund at that moment (refund via
 *     Square vs. no refund) — no more checkbox that had to be set first
 *   - every change shows a "what happens when you Save" summary with Undo;
 *     nothing takes effect until the admin clicks Save
 *
 * Under the hood this still just sets the same `status` and `skipRefund`
 * form fields — all server-side hooks, guards, seat math, refunds, and
 * waitlist promotion behave exactly as before.
 */
import React, { useState } from 'react'
import { useField, useFormFields, useDocumentInfo } from '@payloadcms/ui'

const BADGE: Record<string, { bg: string; fg: string; border: string }> = {
  confirmed:  { bg: '#d1fae5', fg: '#065f46', border: '#6ee7b7' },
  waitlisted: { bg: '#fef3c7', fg: '#92400e', border: '#fcd34d' },
  cancelled:  { bg: '#fee2e2', fg: '#991b1b', border: '#fca5a5' },
}

function Badge({ status }: { status: string }) {
  const c = BADGE[status] ?? { bg: '#f3f4f6', fg: '#374151', border: '#d1d5db' }
  return (
    <span style={{
      display: 'inline-block', padding: '3px 12px', fontSize: '11px', fontWeight: 700,
      letterSpacing: '0.05em', textTransform: 'uppercase', borderRadius: '999px',
      border: `1px solid ${c.border}`, background: c.bg, color: c.fg, whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  )
}

const ghostBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '8px 16px',
  borderRadius: 'var(--style-radius-s, 4px)', fontSize: '13px', fontWeight: 600,
  cursor: 'pointer', border: '1px solid var(--theme-elevation-250)',
  background: 'transparent', color: 'var(--theme-text)',
}
const dangerBtn: React.CSSProperties = {
  ...ghostBtn, border: '1px solid #fca5a5', color: '#b91c1c',
}
const bigChoiceBtn: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px',
  borderRadius: 'var(--style-radius-s, 4px)', cursor: 'pointer',
  border: '1px solid var(--theme-elevation-250)', background: 'var(--theme-elevation-50)',
  color: 'var(--theme-text)', fontSize: '13px',
}

export default function BookingStatusPanel() {
  const { id } = useDocumentInfo()
  const statusField = useField<string>({ path: 'status' })
  const skipField = useField<boolean>({ path: 'skipRefund' })
  const pay = useFormFields(([fields]) => ({
    squarePaymentId: (fields?.squarePaymentId?.value as string) ?? '',
    amountPaidCents: (fields?.amountPaidCents?.value as number) ?? 0,
  }))

  const [choosingCancel, setChoosingCancel] = useState(false)

  const status = statusField.value ?? 'confirmed'
  const saved = (statusField.initialValue as string | undefined) ?? undefined
  const isNew = !id
  const hasPendingChange = !isNew && !!saved && status !== saved
  const hasOnlinePayment = Boolean(pay.squarePaymentId) && pay.amountPaidCents > 0
  const amt = `$${(pay.amountPaidCents / 100).toFixed(2)}`

  const apply = (newStatus: string, skipRefund: boolean) => {
    statusField.setValue(newStatus)
    skipField.setValue(skipRefund)
    setChoosingCancel(false)
  }
  const undo = () => {
    statusField.setValue(saved)
    skipField.setValue(false)
    setChoosingCancel(false)
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, color: 'var(--theme-text)' }}>
        Booking Status
      </p>

      <div style={{
        padding: '16px', borderRadius: 'var(--style-radius-s, 6px)',
        background: 'var(--theme-elevation-50)', border: '1px solid var(--theme-elevation-150)',
      }}>

        {/* ── New booking: pick the starting status ─────────────────────────── */}
        {isNew && (
          <div>
            <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--theme-elevation-600)', lineHeight: 1.5 }}>
              Choose how this booking starts. The usual choice is Confirmed — Waitlisted is
              for adding someone to a session that is already full.
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(['confirmed', 'waitlisted'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => apply(opt, false)}
                  style={{
                    ...ghostBtn,
                    ...(status === opt
                      ? { border: `1px solid ${BADGE[opt].border}`, background: BADGE[opt].bg, color: BADGE[opt].fg }
                      : {}),
                  }}
                >
                  {opt === 'confirmed' ? '✓ Confirmed (takes a seat)' : 'Waitlisted (waiting for a seat)'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Existing booking, no pending change ───────────────────────────── */}
        {!isNew && !hasPendingChange && !choosingCancel && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <Badge status={status} />
              <span style={{ fontSize: '13px', color: 'var(--theme-elevation-600)' }}>
                {status === 'confirmed' && 'This person holds a seat in the session.'}
                {status === 'waitlisted' && 'This person is on the waitlist — they are in line for a seat.'}
                {status === 'cancelled' && 'This booking is cancelled — no seat is held.'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
              {status === 'confirmed' && (
                <>
                  <button type="button" style={dangerBtn} onClick={() => setChoosingCancel(true)}>
                    Cancel this booking…
                  </button>
                  <button type="button" style={ghostBtn} onClick={() => apply('waitlisted', false)}>
                    Move to waitlist
                  </button>
                </>
              )}
              {status === 'waitlisted' && (
                <>
                  <button
                    type="button"
                    style={{ ...ghostBtn, border: '1px solid #6ee7b7', color: '#065f46' }}
                    onClick={() => apply('confirmed', false)}
                  >
                    ✓ Give them a seat (Confirm)
                  </button>
                  <button type="button" style={dangerBtn} onClick={() => setChoosingCancel(true)}>
                    Cancel this booking…
                  </button>
                </>
              )}
              {status === 'cancelled' && (
                <>
                  <button type="button" style={ghostBtn} onClick={() => apply('confirmed', false)}>
                    Reactivate as Confirmed
                  </button>
                  <button type="button" style={ghostBtn} onClick={() => apply('waitlisted', false)}>
                    Reactivate as Waitlisted
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Cancel: choose how the refund is handled ──────────────────────── */}
        {!isNew && choosingCancel && !hasPendingChange && (
          <div>
            <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: '#b91c1c' }}>
              How should this cancellation be handled?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {hasOnlinePayment ? (
                <>
                  <button type="button" style={bigChoiceBtn} onClick={() => apply('cancelled', false)}>
                    <strong>Cancel and refund {amt} to their card</strong>
                    <span style={{ display: 'block', marginTop: '2px', fontSize: '12px', color: 'var(--theme-elevation-600)' }}>
                      Square issues the refund automatically when you save. This is the normal choice.
                    </span>
                  </button>
                  <button type="button" style={{ ...bigChoiceBtn, border: '1px solid #fca5a5' }} onClick={() => apply('cancelled', true)}>
                    <strong style={{ color: '#b91c1c' }}>Cancel WITHOUT refunding</strong>
                    <span style={{ display: 'block', marginTop: '2px', fontSize: '12px', color: 'var(--theme-elevation-600)' }}>
                      They paid {amt} online and no money will be returned. Use only when your
                      policy calls for it (e.g. late cancellation or no-show).
                    </span>
                  </button>
                </>
              ) : (
                <button type="button" style={bigChoiceBtn} onClick={() => apply('cancelled', true)}>
                  <strong>Cancel this booking</strong>
                  <span style={{ display: 'block', marginTop: '2px', fontSize: '12px', color: 'var(--theme-elevation-600)' }}>
                    No online payment is attached, so there is nothing to auto-refund. If you
                    returned money outside the site (cash, POS), record it in the Manual Refund
                    Amount field that appears below.
                  </span>
                </button>
              )}
            </div>
            <div style={{ marginTop: '10px' }}>
              <button type="button" style={ghostBtn} onClick={() => setChoosingCancel(false)}>
                Never mind
              </button>
            </div>
          </div>
        )}

        {/* ── Pending change: say exactly what Save will do ─────────────────── */}
        {!isNew && hasPendingChange && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <Badge status={saved ?? ''} />
              <span style={{ color: 'var(--theme-elevation-500)' }}>→</span>
              <Badge status={status} />
            </div>
            <div style={{
              padding: '12px 14px', borderRadius: 'var(--style-radius-s, 4px)',
              border: '1px solid #f59e0b', background: 'rgba(245, 158, 11, 0.09)',
              fontSize: '13px', color: 'var(--theme-text)', lineHeight: 1.55,
            }}>
              <p style={{ margin: 0, fontWeight: 700 }}>When you click Save:</p>
              <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
                {status === 'cancelled' && (
                  <>
                    <li>The booking becomes <strong>Cancelled</strong> and its seat is freed.</li>
                    {hasOnlinePayment && !skipField.value && (
                      <li>Square automatically refunds <strong>{amt}</strong> to the customer&apos;s card.</li>
                    )}
                    {hasOnlinePayment && skipField.value && (
                      <li><strong style={{ color: '#b91c1c' }}>No refund will be issued</strong> — they keep nothing of the {amt} they paid online.</li>
                    )}
                    {!hasOnlinePayment && (
                      <li>No automatic refund (no online payment attached). Use <strong>Manual Refund Amount</strong> below if you returned money another way.</li>
                    )}
                    <li>If anyone is waitlisted for this session, the oldest is automatically confirmed and emailed.</li>
                  </>
                )}
                {status === 'confirmed' && saved === 'waitlisted' && (
                  <li>The booking becomes <strong>Confirmed</strong> — they now hold a seat.</li>
                )}
                {status === 'confirmed' && saved === 'cancelled' && (
                  <li>The booking is reactivated as <strong>Confirmed</strong> and takes a seat. If the session is full, saving will be blocked.</li>
                )}
                {status === 'waitlisted' && saved === 'confirmed' && (
                  <li>The booking becomes <strong>Waitlisted</strong> — they stay in the seat count but are marked as waiting.</li>
                )}
                {status === 'waitlisted' && saved === 'cancelled' && (
                  <li>The booking is reactivated as <strong>Waitlisted</strong> — back in line for a seat.</li>
                )}
              </ul>
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--theme-elevation-600)' }}>
                Nothing has happened yet — click <strong>Save</strong> to apply, or Undo to keep things as they are.
              </p>
            </div>
            <div style={{ marginTop: '10px' }}>
              <button type="button" style={ghostBtn} onClick={undo}>
                ↩ Undo — keep it {saved}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
