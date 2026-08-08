'use client'
import React, { useState } from 'react'

export interface NotificationRow {
  id: number
  whatHappened: string
  whatToDo: string
  link: string | null
  linkLabel: string | null
  createdAt: string
}

/** "Today, 5:09 PM" / "Aug 7, 2:41 PM" in Eastern Time. */
function formatWhen(iso: string): string {
  try {
    const d = new Date(iso)
    const time = d.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York',
    })
    const dayET = d.toLocaleDateString('en-US', { timeZone: 'America/New_York' })
    const todayET = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' })
    if (dayET === todayET) return `Today, ${time}`
    const date = d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', timeZone: 'America/New_York',
      ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
    })
    return `${date}, ${time}`
  } catch {
    return iso
  }
}

export default function NotificationsTable({ initialRows }: { initialRows: NotificationRow[] }) {
  const [rows, setRows] = useState<NotificationRow[]>(initialRows)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [errorId, setErrorId] = useState<number | null>(null)

  const dismiss = async (id: number) => {
    setBusyId(id)
    setErrorId(null)
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissed: true }),
      })
      if (res.status === 401 || res.status === 403) {
        setSessionExpired(true)
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setRows((prev) => prev.filter((r) => r.id !== id))
    } catch {
      setErrorId(id)
    } finally {
      setBusyId(null)
    }
  }

  if (sessionExpired) {
    return (
      <div style={{
        background: 'var(--theme-elevation-50)', borderRadius: '8px',
        padding: '20px 24px', maxWidth: '640px', fontSize: '14px', lineHeight: 1.6,
      }}>
        <strong>Your login session has expired.</strong>
        <p style={{ margin: '8px 0 0' }}>
          Please{' '}
          <a href={`/admin/login?redirect=${encodeURIComponent('/admin/notifications')}`} style={{ color: '#ea580c' }}>
            log in again
          </a>{' '}
          and you&apos;ll be brought right back here.
        </p>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div style={{
        background: 'var(--theme-elevation-50)', borderRadius: '8px',
        padding: '28px 24px', textAlign: 'center', color: 'var(--theme-elevation-500, #888)',
        fontSize: '14px',
      }}>
        Nothing needs your attention right now. ✓
      </div>
    )
  }

  const thStyle: React.CSSProperties = {
    textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    color: 'var(--theme-elevation-500, #888)', whiteSpace: 'nowrap',
  }
  const tdStyle: React.CSSProperties = {
    padding: '14px', fontSize: '13px', lineHeight: 1.55,
    color: 'var(--theme-text)', verticalAlign: 'top',
  }

  return (
    <div style={{ background: 'var(--theme-elevation-100)', borderRadius: '8px', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
        <thead>
          <tr>
            <th style={thStyle}>When</th>
            <th style={thStyle}>What happened</th>
            <th style={thStyle}>What to do</th>
            <th style={{ ...thStyle, width: '1%' }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} style={i % 2 === 1 ? { background: 'var(--theme-elevation-50)' } : undefined}>
              <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: 'var(--theme-elevation-500, #888)' }}>
                {formatWhen(r.createdAt)}
              </td>
              <td style={{ ...tdStyle, maxWidth: '340px' }}>{r.whatHappened}</td>
              <td style={{ ...tdStyle, maxWidth: '340px' }}>
                {r.whatToDo}
                {r.link && (
                  <>
                    {' '}
                    <a href={r.link} style={{ color: '#ea580c', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      → {r.linkLabel || 'Open'}
                    </a>
                  </>
                )}
              </td>
              <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                <button
                  type="button"
                  onClick={() => dismiss(r.id)}
                  disabled={busyId === r.id}
                  style={{
                    padding: '6px 14px', fontSize: '12px', fontWeight: 600,
                    borderRadius: '5px', border: '1px solid var(--theme-elevation-250)',
                    background: 'transparent', color: 'var(--theme-text)',
                    cursor: busyId === r.id ? 'wait' : 'pointer',
                    opacity: busyId === r.id ? 0.6 : 1,
                  }}
                >
                  {busyId === r.id ? 'Dismissing…' : 'Dismiss'}
                </button>
                {errorId === r.id && (
                  <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '4px' }}>
                    Didn&apos;t work — try again.
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
