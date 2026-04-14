'use client'
import React, { useState } from 'react'
import { useFormFields, useDocumentInfo } from '@payloadcms/ui'

/**
 * Shown on a PendingBooking document when status === 'failed' and a
 * Square Order ID is present. Calls the collection's custom /retry endpoint
 * to re-attempt Attendee + Booking creation using stored data.
 */
export default function RetryBookingButton() {
  const { id } = useDocumentInfo()
  const status = useFormFields(([fields]) => fields.status?.value as string | undefined)
  const squareOrderId = useFormFields(([fields]) => fields.squareOrderId?.value as string | undefined)

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  if (status !== 'failed' || !squareOrderId || !id) return null

  const handleRetry = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`/api/pending-bookings/${id}/retry`, {
        method: 'POST',
        credentials: 'include', // send admin session cookie
      })
      const json = await res.json()
      if (res.ok) {
        setResult({ ok: true, message: 'Booking created successfully. Refresh to see updated status.' })
      } else {
        setResult({ ok: false, message: json.error ?? 'Retry failed. Check server logs.' })
      }
    } catch {
      setResult({ ok: false, message: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        padding: '12px 0',
        borderBottom: '1px solid var(--theme-elevation-100)',
        marginBottom: 'var(--base)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <button
        type="button"
        onClick={handleRetry}
        disabled={loading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 18px',
          background: loading ? 'var(--theme-elevation-150)' : '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: 'var(--style-radius-s)',
          color: '#991b1b',
          fontSize: '13px',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Retrying…' : '↻ Retry Booking Creation'}
      </button>

      {result && (
        <span
          style={{
            fontSize: '12px',
            color: result.ok ? '#065f46' : '#991b1b',
            fontWeight: 500,
          }}
        >
          {result.ok ? '✓' : '✗'} {result.message}
        </span>
      )}
    </div>
  )
}
