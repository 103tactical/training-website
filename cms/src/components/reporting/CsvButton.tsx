'use client'
import React from 'react'

interface Props {
  headers: string[]
  rows: (string | number | null | undefined)[][]
  filename: string
  label?: string
}

export default function CsvButton({ headers, rows, filename, label = 'Export CSV' }: Props) {
  const handleDownload = () => {
    const esc = (v: string | number | null | undefined) =>
      `"${String(v ?? '').replace(/"/g, '""')}"`
    const csv = [
      headers.map(esc).join(','),
      ...rows.map(row => row.map(esc).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleDownload}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        background: 'var(--theme-elevation-150, #2a2a2a)',
        border: '1px solid var(--theme-elevation-300, #444)',
        borderRadius: '4px',
        color: 'var(--theme-text)',
        fontSize: '13px',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      ↓ {label}
    </button>
  )
}
