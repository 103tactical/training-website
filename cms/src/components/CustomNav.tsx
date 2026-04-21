'use client'
import React from 'react'
import Link from 'next/link'
import { NavGroup } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'

// ── Helper ────────────────────────────────────────────────────────────────────

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link href={href} className={`nav__link${isActive ? ' active' : ''}`}>
      <span className="nav__link-label">{label}</span>
    </Link>
  )
}

// ── Nav sections ──────────────────────────────────────────────────────────────

const COURSE_MGMT = [
  { href: '/admin/schedule-dashboard',                label: 'Schedule Dashboard' },
  { href: '/admin/collections/course-schedules',      label: 'Course Schedules' },
  { href: '/admin/collections/courses',               label: 'Courses' },
  { href: '/admin/collections/course-groups',         label: 'Course Groups' },
  { href: '/admin/collections/instructors',           label: 'Instructors' },
  { href: '/admin/collections/attendees',             label: 'Attendees' },
  { href: '/admin/collections/bookings',              label: 'Bookings' },
  { href: '/admin/collections/pending-bookings',      label: 'Pending Bookings' },
]

const ACCOUNTING = [
  { href: '/admin/reporting/dashboard',  label: 'Dashboard' },
  { href: '/admin/reporting/revenue',    label: 'Revenue Report' },
  { href: '/admin/reporting/bookings',   label: 'Bookings Report' },
  { href: '/admin/reporting/refunds',    label: 'Refunds & Cancellations' },
]

const PAGES = [
  { href: '/admin/globals/home-page',         label: 'Home Page' },
  { href: '/admin/globals/courses-page',      label: 'Courses Page' },
  { href: '/admin/globals/applications-page', label: 'Applications Page' },
  { href: '/admin/globals/store-page',        label: 'Store Page' },
  { href: '/admin/globals/contact-settings',  label: 'Contact Settings' },
  { href: '/admin/globals/site-settings',     label: 'Site Settings' },
  { href: '/admin/globals/utility',           label: 'Utility' },
  { href: '/admin/collections/badges',        label: 'Badges' },
]

const MEDIA_USERS = [
  { href: '/admin/collections/media', label: 'Media' },
  { href: '/admin/collections/users', label: 'Users' },
]

const DATA = [
  { href: '/admin/collections/contact-submissions', label: 'Contact Submissions' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function CustomNav() {
  return (
    <>
      <NavGroup label="Course Management">
        {COURSE_MGMT.map(l => <NavLink key={l.href} href={l.href} label={l.label} />)}
      </NavGroup>

      <NavGroup label="Accounting & Reports">
        {ACCOUNTING.map(l => <NavLink key={l.href} href={l.href} label={l.label} />)}
      </NavGroup>

      <NavGroup label="Pages">
        {PAGES.map(l => <NavLink key={l.href} href={l.href} label={l.label} />)}
      </NavGroup>

      <NavGroup label="Media & Users">
        {MEDIA_USERS.map(l => <NavLink key={l.href} href={l.href} label={l.label} />)}
      </NavGroup>

      <NavGroup label="Data">
        {DATA.map(l => <NavLink key={l.href} href={l.href} label={l.label} />)}
      </NavGroup>
    </>
  )
}
