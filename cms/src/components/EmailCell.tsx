'use client'
import React from 'react'
import type { DefaultCellComponentProps } from 'payload'

export default function EmailCell({ cellData }: DefaultCellComponentProps) {
  const email = cellData as string
  if (!email) return null

  return (
    <a
      href={`mailto:${email}`}
      onClick={(e) => e.stopPropagation()}
      style={{ color: 'var(--theme-text)', textDecoration: 'underline' }}
    >
      {email}
    </a>
  )
}
