'use client'
import React from 'react'
import { useTheme } from '@payloadcms/ui'

export default function AdminLogo() {
  const { theme } = useTheme()

  return (
    <img
      src={theme === 'dark' ? '/img/103_logo_admin_white.png' : '/img/103_logo_admin_black.png'}
      alt="103 Tactical"
      style={{ height: '52px', width: 'auto' }}
    />
  )
}
