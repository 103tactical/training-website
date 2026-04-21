import React from 'react'
import Link from 'next/link'
import ResendQuotaWidget from './ResendQuotaWidget'

const SECTIONS = [
  {
    label: 'Course Management',
    links: [
      { href: '/admin/schedule-dashboard',                          label: 'Course Calendar' },
      { href: '/admin/collections/courses',                         label: 'Courses' },
      { href: '/admin/collections/course-groups',                   label: 'Course Groups' },
      { href: '/admin/collections/course-schedules',                label: 'Course Schedules' },
      { href: '/admin/collections/private-group-bookings',          label: 'Private Group Bookings' },
      { href: '/admin/collections/pending-bookings',                label: 'Pending Bookings' },
      { href: '/admin/collections/bookings',                        label: 'Bookings' },
      { href: '/admin/collections/attendees',                       label: 'Attendees' },
      { href: '/admin/collections/instructors',                     label: 'Instructors' },
    ],
  },
  {
    label: 'Accounting & Reports',
    links: [
      { href: '/admin/reporting/dashboard', label: 'Overview' },
      { href: '/admin/reporting/revenue',   label: 'Revenue Report' },
      { href: '/admin/reporting/bookings',  label: 'Bookings Report' },
      { href: '/admin/reporting/refunds',   label: 'Refunds & Cancellations' },
    ],
  },
  {
    label: 'Data',
    links: [
      { href: '/admin/collections/contact-submissions', label: 'Contact Submissions' },
    ],
  },
  {
    label: 'Page Content',
    links: [
      { href: '/admin/globals/home-page',         label: 'Home Page' },
      { href: '/admin/globals/courses-page',      label: 'Courses Page' },
      { href: '/admin/globals/applications-page', label: 'Applications Page' },
      { href: '/admin/globals/store-page',        label: 'Store Page' },
      { href: '/admin/globals/contact-settings',  label: 'Contact Page' },
    ],
  },
  {
    label: 'Configuration',
    links: [
      { href: '/admin/globals/site-settings', label: 'Site Settings' },
      { href: '/admin/globals/utility',        label: 'Site Utilities' },
    ],
  },
  {
    label: 'Collections',
    links: [
      { href: '/admin/collections/users',  label: 'Users' },
      { href: '/admin/collections/media',  label: 'Media' },
      { href: '/admin/collections/badges', label: 'Badges' },
    ],
  },
]

export default function AdminDashboard() {
  return (
    <div style={{
      padding: '2.5rem',
      maxWidth: '960px',
    }}>
      <h1 style={{
        fontSize: '1.5rem',
        fontWeight: 700,
        marginBottom: '2rem',
        color: 'var(--theme-text)',
      }}>
        Dashboard
      </h1>

      <ResendQuotaWidget />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {SECTIONS.map((section) => (
          <div key={section.label}>
            {/* Orange-highlighted section header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '12px',
            }}>
              <div style={{
                width: '3px',
                height: '18px',
                borderRadius: '2px',
                background: '#ea580c',
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#ea580c',
              }}>
                {section.label}
              </span>
            </div>

            {/* Link cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '8px',
            }}>
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={false}
                  className="adash-card"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
