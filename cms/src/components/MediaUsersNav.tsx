'use client'
import React from 'react'
import Link from 'next/link'
import { NavGroup } from '@payloadcms/ui'

const LINKS = [
  { href: '/admin/collections/media', label: 'Media' },
  { href: '/admin/collections/users', label: 'Users' },
]

export default function MediaUsersNav() {
  return (
    <NavGroup label="Media & Users">
      {LINKS.map(({ href, label }) => (
        <Link key={href} className="nav__link" href={href}>
          <span className="nav__link-label">{label}</span>
        </Link>
      ))}
    </NavGroup>
  )
}
