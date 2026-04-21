'use client'
import React, { useRef, useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

type Phase = 'idle' | 'composing' | 'sending' | 'done' | 'error'

const ALLOWED_TYPES  = ['application/pdf', 'image/jpeg', 'image/png']
const ALLOWED_ACCEPT = '.pdf,.jpg,.jpeg,.png'
const MAX_PER_FILE   = 5  * 1024 * 1024  // 5 MB
const MAX_TOTAL      = 10 * 1024 * 1024  // 10 MB
const MAX_FILES      = 5

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

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
  const [files, setFiles]       = useState<File[]>([])
  const fileInputRef            = useRef<HTMLInputElement>(null)

  const webUrl  = process.env.NEXT_PUBLIC_WEB_URL ?? ''
  const token   = process.env.NEXT_PUBLIC_PRINT_SECRET ?? ''
  const query   = token ? `?token=${token}` : ''
  const printHref = id ? `${webUrl}/print/roster/${id}${query}` : null

  if (!id) return null

  const open  = () => setPhase('composing')
  const close = () => {
    setPhase('idle'); setSubject(''); setMessage(''); setFeedback(''); setFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    const errors: string[] = []

    const valid = selected.filter((f) => {
      if (!ALLOWED_TYPES.includes(f.type)) {
        errors.push(`"${f.name}" is not allowed (PDF, JPEG, PNG only).`)
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
      setFeedback(errors.join(' '))
    } else if (totalSize > MAX_TOTAL) {
      setFeedback('Total attachment size would exceed the 10 MB limit.')
    } else {
      setFeedback('')
      setFiles(merged)
    }
    // Reset input so the same file can be re-selected after removal
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setFeedback('')
  }

  const send = async () => {
    if (!subject.trim() || !message.trim()) {
      setFeedback('Subject and message are both required.')
      return
    }
    setPhase('sending')
    setFeedback('')
    try {
      const formData = new FormData()
      formData.append('subject', subject.trim())
      formData.append('message', message.trim())
      files.forEach((f) => formData.append('attachments', f))

      const res = await fetch(`/api/course-schedules/${id}/email-attendees`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
        // No Content-Type header — browser sets it with the multipart boundary
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
              <span className="roster-btn__icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
              </span>
              Print Roster
            </a>
          )}
          <button type="button" onClick={open} className="roster-btn">
            <span className="roster-btn__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </span>
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

          {/* ── Attachments ─────────────────────────────────────────────────── */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: 'var(--theme-elevation-700)' }}>
              Attachments <span style={{ fontWeight: 400 }}>(PDF, JPEG, PNG — 5 MB per file, 10 MB total, max {MAX_FILES})</span>
            </label>

            {/* Selected file list */}
            {files.length > 0 && (
              <ul style={{ listStyle: 'none', margin: '0 0 8px', padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {files.map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--theme-text)' }}>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      📎 {f.name} <span style={{ color: 'var(--theme-elevation-500)' }}>({formatBytes(f.size)})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      disabled={phase === 'sending'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontSize: '13px', padding: '0 2px', lineHeight: 1 }}
                      aria-label={`Remove ${f.name}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {files.length < MAX_FILES && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_ACCEPT}
                  multiple
                  onChange={handleFileChange}
                  disabled={phase === 'sending'}
                  style={{ display: 'none' }}
                  id="roster-email-attachments"
                />
                <label
                  htmlFor="roster-email-attachments"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: phase === 'sending' ? 'not-allowed' : 'pointer',
                    opacity: phase === 'sending' ? 0.55 : 1,
                    border: '1px dashed var(--theme-elevation-300)',
                    borderRadius: 'var(--style-radius-s)',
                    color: 'var(--theme-elevation-700)',
                    userSelect: 'none',
                  }}
                >
                  + Add file{files.length > 0 ? ' (another)' : ''}
                </label>
              </>
            )}

            {files.length > 0 && (
              <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'var(--theme-elevation-500)' }}>
                Total: {formatBytes(files.reduce((s, f) => s + f.size, 0))} / 10 MB
              </p>
            )}
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
