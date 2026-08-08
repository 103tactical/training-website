'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'

/**
 * Dashboard banner showing how many undismissed notifications exist.
 * Renders NOTHING when the count is zero or the check fails — no
 * "0 notifications" noise, and an API hiccup never breaks the dashboard.
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
      .catch(() => { /* silent — banner simply doesn't render */ })
    return () => { cancelled = true }
  }, [])

  if (count === 0) return null

  return (
    <Link
      href="/admin/notifications"
      prefetch={false}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '16px', flexWrap: 'wrap',
        background: '#ea580c', borderRadius: '8px',
        padding: '14px 18px', marginBottom: '20px',
        textDecoration: 'none',
      }}
    >
      <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 700 }}>
        {count === 1 ? '1 thing may need your attention' : `${count} things may need your attention`}
      </span>
      <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>
        View notifications →
      </span>
    </Link>
  )
}
