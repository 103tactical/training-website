'use client'
import React from 'react'
import type { DefaultCellComponentProps } from 'payload'

/**
 * List-view cell for squarePaymentId. Manual bookings (cash/check/etc.) have
 * no Square payment — show a quiet "—" instead of Payload's default
 * "<No Square Payment ID>", which read like a payment problem.
 */
export default function SquarePaymentIdCell({ cellData }: DefaultCellComponentProps) {
  const value = (cellData as string | undefined) ?? ''
  if (!value) {
    return <span style={{ color: 'var(--theme-elevation-400)' }}>—</span>
  }
  return <code style={{ fontSize: '12px' }}>{value}</code>
}
