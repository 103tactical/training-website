'use client'
import React from 'react'

const STYLES: Record<string, { label: string; bg: string; color: string }> = {
  'online':        { label: 'Online',      bg: 'rgba(37, 99, 235, 0.12)',  color: '#2563eb' },
  'square-manual': { label: 'Square',      bg: 'rgba(249, 115, 22, 0.12)', color: '#f97316' },
  'cash':          { label: 'Cash',        bg: 'rgba(22, 163, 74, 0.12)',  color: '#16a34a' },
  'check':         { label: 'Check',       bg: 'rgba(13, 148, 136, 0.12)', color: '#0d9488' },
  'other':         { label: 'Other',       bg: 'rgba(128, 128, 128, 0.15)', color: 'var(--theme-text)' },
}

export default function PaymentMethodCell({ cellData }: { cellData?: string }) {
  if (!cellData) return <span style={{ opacity: 0.35 }}>—</span>
  const s = STYLES[cellData] ?? STYLES['other']
  return (
    <span
      style={{
        display: 'inline-block', padding: '2px 8px',
        borderRadius: 'var(--style-radius-s, 4px)',
        fontSize: '11px', fontWeight: 600,
        background: s.bg, color: s.color,
      }}
    >
      {s.label}
    </span>
  )
}
