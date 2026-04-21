'use client'
import React from 'react'
import type { DefaultCellComponentProps } from 'payload'

export default function FailureReasonCell({ cellData }: DefaultCellComponentProps) {
  const text = (cellData as string) ?? ''
  if (!text) return null
  return (
    <span
      style={{
        display: 'block',
        fontSize: '11px',
        color: '#991b1b',
        fontFamily: 'var(--font-mono, monospace)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        maxWidth: '420px',
        lineHeight: 1.4,
      }}
    >
      {text}
    </span>
  )
}
