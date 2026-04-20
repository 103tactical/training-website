'use client'
import React from 'react'
import Link from 'next/link'
import { NavGroup } from '@payloadcms/ui'

const LINKS = [
  { href: '/admin/reporting/dashboard', label: 'Dashboard' },
  { href: '/admin/reporting/revenue',   label: 'Revenue Report' },
  { href: '/admin/reporting/bookings',  label: 'Bookings Report' },
  { href: '/admin/reporting/refunds',   label: 'Refunds & Cancellations' },
]

export default function AccountingNav() {
  return (
    <NavGroup label="Accounting & Reports">
      {LINKS.map(({ href, label }) => (
        <Link key={href} className="nav__link" href={href}>
          <span className="nav__link-label">{label}</span>
        </Link>
      ))}
    </NavGroup>
  )
}
