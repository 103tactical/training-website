'use client'
import React, { useState, useEffect } from 'react'
import { useTheme } from '@payloadcms/ui'

export default function AdminLogo() {
  const { theme } = useTheme()
  const [systemDark, setSystemDark] = useState(false)

  // Track OS-level dark mode preference for when theme is set to 'auto'
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const isDark = theme === 'dark' || (theme === 'auto' && systemDark)

  return (
    <img
      src={isDark ? '/img/103_logo_admin_white.png' : '/img/103_logo_admin_black.png'}
      alt="103 Tactical"
      style={{ height: '52px', width: 'auto' }}
    />
  )
}
