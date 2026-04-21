'use client'
import React from 'react'
import Link from 'next/link'
import { NavGroup } from '@payloadcms/ui'

const LINKS = [
  { href: '/admin/globals/home-page',         label: 'Home Page' },
  { href: '/admin/globals/courses-page',      label: 'Courses Page' },
  { href: '/admin/globals/applications-page', label: 'Applications Page' },
  { href: '/admin/globals/store-page',        label: 'Store Page' },
  { href: '/admin/globals/contact-settings',  label: 'Contact Settings' },
  { href: '/admin/globals/site-settings',     label: 'Site Settings' },
  { href: '/admin/globals/utility',           label: 'Utility' },
  { href: '/admin/collections/badges',        label: 'Badges' },
]

export default function PagesNav() {
  return (
    <NavGroup label="Pages">
      {LINKS.map(({ href, label }) => (
        <Link key={href} className="nav__link" href={href}>
          <span className="nav__link-label">{label}</span>
        </Link>
      ))}
    </NavGroup>
  )
}
