'use client'
import React from 'react'
import type { DefaultCellComponentProps } from 'payload'

const styles: Record<string, React.CSSProperties> = {
  pending: {
    background: '#eff6ff',
    color: '#1e40af',
    borderColor: '#93c5fd',
  },
  completed: {
    background: '#d1fae5',
    color: '#065f46',
    borderColor: '#6ee7b7',
  },
  failed: {
    background: '#fee2e2',
    color: '#991b1b',
    borderColor: '#fca5a5',
  },
  expired: {
    background: '#f3f4f6',
    color: '#6b7280',
    borderColor: '#d1d5db',
  },
}

const labels: Record<string, string> = {
  pending:   'Pending',
  completed: 'Completed',
  failed:    'Failed',
  expired:   'Expired',
}

export default function PendingStatusBadge({ cellData }: DefaultCellComponentProps) {
  const value = (cellData as string) ?? ''
  const style = styles[value] ?? { background: '#f3f4f6', color: '#374151', borderColor: '#d1d5db' }
  const label = labels[value] ?? value

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        borderRadius: '999px',
        border: `1px solid ${style.borderColor}`,
        background: style.background,
        color: style.color,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}
