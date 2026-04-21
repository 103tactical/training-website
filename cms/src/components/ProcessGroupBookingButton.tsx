'use client'
import React, { useRef, useState } from 'react'
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

// ── Attachment constants (mirrors RosterActionsBar / emailAttendeesHandler) ───
const ALLOWED_TYPES  = [
  'application/pdf',
  'image/jpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]
const ALLOWED_ACCEPT = '.pdf,.jpg,.jpeg,.doc,.docx,.txt'
const MAX_PER_FILE   = 5  * 1024 * 1024  // 5 MB
const MAX_TOTAL      = 10 * 1024 * 1024  // 10 MB
const MAX_FILES      = 5

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Rendered at the bottom of the Private Group Booking form.
 * Lets the admin trigger the process endpoint which creates the schedule,
 * creates bookings or sends Square payment links, and emails attendees.
 * Supports optional file attachments (PDF, JPG, Word, TXT — same limits as
 * the Email Attendees feature on Course Schedules).
 */
export default function ProcessGroupBookingButton() {
  const { id } = useDocumentInfo()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paymentMethod = useFormFields((fields: any) => (fields?.paymentMethod?.value as string) ?? '')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const status = useFormFields((fields: any) => (fields?.status?.value as string) ?? 'draft')

  const [phase, setPhase]           = useState<Phase>('idle')
  const [response, setResponse]     = useState<ProcessResponse | null>(null)
  const [errorMsg, setErrorMsg]     = useState<string>('')
  const [files, setFiles]           = useState<File[]>([])
  const [attachError, setAttachError] = useState<string>('')
  const fileInputRef                = useRef<HTMLInputElement>(null)

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    const errors: string[] = []

    const valid = selected.filter((f) => {
      if (!ALLOWED_TYPES.includes(f.type)) {
        errors.push(`"${f.name}" is not an allowed type (PDF, JPG, Word, or TXT only).`)
        return false
      }
      if (f.size > MAX_PER_FILE) {
        errors.push(`"${f.name}" exceeds the 5 MB per-file limit.`)
        return false
      }
      return true
    })

    const merged = [...files, ...valid].slice(0, MAX_FILES)
    const totalSize = merged.reduce((sum, f) => sum + f.size, 0)

    if (errors.length > 0) {
      setAttachError(errors.join(' '))
    } else if (totalSize > MAX_TOTAL) {
      setAttachError('Total attachment size would exceed the 10 MB limit.')
    } else {
      setAttachError('')
      setFiles(merged)
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setAttachError('')
  }

  const handleProcess = async () => {
    setPhase('processing')
    setErrorMsg('')
    setResponse(null)

    try {
      const formData = new FormData()
      files.forEach((f) => formData.append('attachments', f))

      const res = await fetch(`/api/private-group-bookings/${id}/process`, {
        method: 'POST',
        body: formData,
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
    setFiles([])
    setAttachError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
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

      {/* ── Attachments ──────────────────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: 600, color: 'var(--theme-elevation-700)' }}>
            Attachments (optional)
          </p>
          <p style={{ margin: '0 0 8px', fontSize: '11px', color: 'var(--theme-elevation-500)', lineHeight: '1.5' }}>
            Files attached here are sent with the email to every attendee.
            PDF, JPG, Word (.doc/.docx), TXT — up to 5 files, 5 MB each, 10 MB total.
          </p>

          {files.length > 0 && (
            <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {files.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    background: 'var(--theme-elevation-100)',
                    fontSize: '12px',
                    color: 'var(--theme-elevation-800)',
                  }}
                >
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.name}
                  </span>
                  <span style={{ color: 'var(--theme-elevation-500)', flexShrink: 0 }}>
                    {formatBytes(f.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--theme-elevation-500)',
                      padding: '0',
                      fontSize: '14px',
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {attachError && (
            <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#b91c1c' }}>{attachError}</p>
          )}

          {files.length < MAX_FILES && (
            <label
              style={{
                display: 'inline-block',
                padding: '6px 12px',
                borderRadius: '4px',
                background: 'var(--theme-elevation-100)',
                border: '1px solid var(--theme-elevation-200)',
                fontSize: '12px',
                cursor: 'pointer',
                color: 'var(--theme-elevation-700)',
              }}
            >
              + Add file
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_ACCEPT}
                multiple
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>
      )}

      {/* ── Action button ────────────────────────────────────────────────────── */}
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
