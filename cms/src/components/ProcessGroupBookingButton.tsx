'use client'
import React, { useState } from 'react'
import { useDocumentInfo, useFormFields } from '@payloadcms/ui'

type Phase = 'idle' | 'processing' | 'done' | 'error'

type AttendeeResult = {
  email: string
  success: boolean
  skipped?: boolean
  error?: string
  checkoutUrl?: string
  bookingId?: number
}

type ProcessResponse = {
  success: boolean
  processed: number
  skipped: number
  failed: number
  results: AttendeeResult[]
}

/**
 * Rendered at the bottom of the Private Group Booking form.
 * Lets the admin trigger the process endpoint which creates the schedule,
 * creates bookings or sends Square payment links, and emails attendees.
 */
export default function ProcessGroupBookingButton() {
  const { id } = useDocumentInfo()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paymentMethod = useFormFields((fields: any) => (fields?.paymentMethod?.value as string) ?? '')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const status = useFormFields((fields: any) => (fields?.status?.value as string) ?? 'draft')

  const [phase, setPhase]       = useState<Phase>('idle')
  const [response, setResponse] = useState<ProcessResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')

  const isManual = paymentMethod === 'manual'
  const isDone   = status === 'completed' || status === 'sent'

  const buttonLabel = isManual
    ? 'Confirm All Attendees (Manual)'
    : 'Send Square Payment Links'

  const retryLabel = isManual
    ? 'Re-confirm Unprocessed Attendees'
    : 'Resend Missing Payment Links'

  if (!id) {
    return (
      <div
        style={{
          padding: '16px',
          borderRadius: '6px',
          background: 'var(--theme-elevation-50)',
          border: '1px solid var(--theme-elevation-150)',
          color: 'var(--theme-elevation-500)',
          fontSize: '13px',
        }}
      >
        <strong>Save the document first</strong> — the Process button will appear after the first save.
      </div>
    )
  }

  const handleProcess = async () => {
    setPhase('processing')
    setErrorMsg('')
    setResponse(null)

    try {
      const res = await fetch(`/api/private-group-bookings/${id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json()

      if (!res.ok) {
        setErrorMsg(json.error ?? 'Processing failed. Check server logs for details.')
        setPhase('error')
        return
      }

      setResponse(json as ProcessResponse)
      setPhase('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unexpected network error.')
      setPhase('error')
    }
  }

  const reset = () => {
    setPhase('idle')
    setResponse(null)
    setErrorMsg('')
  }

  return (
    <div
      style={{
        marginTop: '8px',
        padding: '20px',
        borderRadius: '6px',
        background: 'var(--theme-elevation-50)',
        border: '1px solid var(--theme-elevation-150)',
      }}
    >
      <p
        style={{
          margin: '0 0 4px',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--theme-elevation-800)',
        }}
      >
        {isDone ? 'Process More' : 'Process Booking'}
      </p>
      <p
        style={{
          margin: '0 0 16px',
          fontSize: '12px',
          color: 'var(--theme-elevation-500)',
          lineHeight: '1.5',
        }}
      >
        {isManual
          ? 'Creates a private course schedule and confirms all attendees as booked. ' +
            'Already-confirmed attendees are skipped automatically.'
          : 'Creates a private course schedule, generates a unique Square checkout link for each attendee, ' +
            'and emails them their payment link. ' +
            'Attendees who already received a link are skipped automatically.'}
        {' '}
        <strong style={{ color: 'var(--theme-elevation-700)' }}>
          Save before clicking.
        </strong>
      </p>

      {phase === 'idle' && (
        <button
          type="button"
          onClick={handleProcess}
          className="btn btn--style-primary btn--size-medium"
          style={{ background: '#ea580c', borderColor: '#ea580c' }}
        >
          {isDone ? retryLabel : buttonLabel}
        </button>
      )}

      {phase === 'processing' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--theme-elevation-600)' }}>
          <span
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid var(--theme-elevation-300)',
              borderTopColor: '#ea580c',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 0.7s linear infinite',
            }}
          />
          Processing attendees — this may take a moment…
        </div>
      )}

      {phase === 'done' && response && (
        <div>
          <div
            style={{
              marginBottom: '12px',
              padding: '12px 16px',
              borderRadius: '5px',
              background: response.failed === 0
                ? 'rgba(22,163,74,0.08)'
                : 'rgba(234,88,12,0.08)',
              border: `1px solid ${response.failed === 0 ? 'rgba(22,163,74,0.25)' : 'rgba(234,88,12,0.25)'}`,
              fontSize: '13px',
              color: 'var(--theme-elevation-800)',
              lineHeight: '1.6',
            }}
          >
            <strong>
              {response.failed === 0 ? '✓ All done' : `⚠ Partial — ${response.failed} failed`}
            </strong>
            <br />
            {response.processed > 0 && `${response.processed} processed  `}
            {response.skipped > 0 && `${response.skipped} already done (skipped)  `}
            {response.failed > 0 && `${response.failed} failed`}
          </div>

          {response.results.some((r) => !r.success) && (
            <div
              style={{
                marginBottom: '12px',
                padding: '10px 14px',
                borderRadius: '4px',
                background: 'rgba(185,28,28,0.07)',
                border: '1px solid rgba(185,28,28,0.2)',
                fontSize: '12px',
                color: 'var(--theme-elevation-800)',
              }}
            >
              <strong style={{ display: 'block', marginBottom: '6px' }}>Failed attendees:</strong>
              {response.results
                .filter((r) => !r.success)
                .map((r) => (
                  <div key={r.email} style={{ marginBottom: '4px' }}>
                    <strong>{r.email}:</strong> {r.error}
                    {r.checkoutUrl && (
                      <span>
                        {' '}(Payment link was created —{' '}
                        <a
                          href={r.checkoutUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#ea580c' }}
                        >
                          copy link
                        </a>
                        )
                      </span>
                    )}
                  </div>
                ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={reset}
              className="btn btn--style-secondary btn--size-medium"
            >
              Dismiss
            </button>
            <span style={{ fontSize: '12px', color: 'var(--theme-elevation-500)' }}>
              Refresh the page to see updated payment statuses in the Attendees section.
            </span>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div>
          <div
            style={{
              marginBottom: '12px',
              padding: '12px 16px',
              borderRadius: '5px',
              background: 'rgba(185,28,28,0.07)',
              border: '1px solid rgba(185,28,28,0.25)',
              fontSize: '13px',
              color: 'var(--theme-elevation-800)',
            }}
          >
            <strong>Error:</strong> {errorMsg}
          </div>
          <button
            type="button"
            onClick={reset}
            className="btn btn--style-secondary btn--size-medium"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}
