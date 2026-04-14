'use client'
import React from 'react'
import type { DefaultCellComponentProps } from 'payload'

/**
 * Shown in the Bookings list view for the transferHistory column.
 * Renders "1 transfer" / "2 transfers", or nothing if the booking has never been moved.
 */
export default function TransferCountCell({ cellData }: DefaultCellComponentProps) {
  const count = Array.isArray(cellData)
    ? cellData.length
    : typeof cellData === 'number'
      ? cellData
      : 0

  if (count === 0) return null

  return (
    <span style={{ fontSize: '12px', color: '#6b7280' }}>
      {count} {count === 1 ? 'transfer' : 'transfers'}
    </span>
  )
}
