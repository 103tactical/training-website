'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'

/**
 * Dashboard notifications bar — ALWAYS present so it has a fixed home:
 *   - idle (zero notifications, or the check failed): quiet grey theme-var
 *     bar, "No notifications need your attention right now."
 *   - active: amber diagonal-stripe bar with a pulsating dot and
 *     "You have N notification(s)". Fixed brand-style colors, deliberately
 *     identical in light and dark mode (same convention as the orange
 *     dashboard section headers).
 */
export default function NotificationsBanner() {
  const [count, setCount] = useState<number>(0)

  useEffect(() => {
    let cancelled = false
    fetch('/api/notifications?where[dismissed][not_equals]=true&limit=0&depth=0', {
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json && typeof json.totalDocs === 'number') setCount(json.totalDocs)
      })
      .catch(() => { /* silent — bar stays in its quiet idle state */ })
    return () => { cancelled = true }
  }, [])

  const active = count > 0

  return (
    <>
      <style>{`
        @keyframes notifPulse {
          0%   { box-shadow: 0 0 0 0 rgba(17, 17, 17, 0.45); }
          70%  { box-shadow: 0 0 0 9px rgba(17, 17, 17, 0); }
          100% { box-shadow: 0 0 0 0 rgba(17, 17, 17, 0); }
        }
      `}</style>
      <Link
        href="/admin/notifications"
        prefetch={false}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '16px', flexWrap: 'wrap',
          borderRadius: '8px',
          padding: '14px 18px', marginBottom: '20px',
          textDecoration: 'none',
          ...(active
            ? {
                background:
                  'repeating-linear-gradient(-45deg, #fbbf24 0px, #fbbf24 14px, #f59e0b 14px, #f59e0b 28px)',
              }
            : {
                background: 'var(--theme-elevation-100)',
              }),
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '11px' }}>
          {active && (
            <span style={{
              width: '11px', height: '11px', borderRadius: '50%',
              background: '#111111', flexShrink: 0,
              animation: 'notifPulse 1.6s ease-out infinite',
            }} />
          )}
          <span style={{
            fontSize: '14px', fontWeight: 700,
            color: active ? '#111111' : 'var(--theme-elevation-500, #888)',
          }}>
            {active
              ? `You have ${count === 1 ? '1 notification' : `${count} notifications`}`
              : 'No notifications need your attention right now.'}
          </span>
        </span>
        <span style={{
          fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap',
          color: active ? '#111111' : 'var(--theme-elevation-500, #888)',
        }}>
          View notifications →
        </span>
      </Link>
    </>
  )
}
