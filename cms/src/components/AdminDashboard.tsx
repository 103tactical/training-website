import React from 'react'
import Link from 'next/link'
import ResendQuotaWidget from './ResendQuotaWidget'

/**
 * Landing dashboard — curated link cards mirroring CustomNav's groups.
 * KEEP IN SYNC with CustomNav.tsx: any item added to the sidebar must be
 * added here too (and vice versa). Each card has a collapsible "What's this?"
 * summary rendered with a native <details> element (no client JS needed).
 */

interface DashLink {
  href: string
  label: string
  bullets: string[]
}

const SECTIONS: { label: string; links: DashLink[] }[] = [
  {
    label: 'Course Management',
    links: [
      {
        href: '/admin/schedule-dashboard',
        label: 'Course Calendar',
        bullets: [
          'Month-view calendar of every scheduled session',
          'Click a session to open its details and roster',
        ],
      },
      {
        href: '/admin/collections/courses',
        label: 'Courses',
        bullets: [
          'The courses you sell — title, price, description, photos',
          'Enrollment email message and document are set per course',
          'Deactivate a course to hide it from the website',
        ],
      },
      {
        href: '/admin/collections/course-groups',
        label: 'Course Groups',
        bullets: [
          'Categories that organize courses on the website',
          'Controls which courses appear together and in what order',
        ],
      },
      {
        href: '/admin/collections/course-schedules',
        label: 'Course Schedules',
        bullets: [
          'Individual dated sessions of a course — dates, times, seats, instructor',
          'Each session page has the roster, Email Attendees, Print Roster, and Send Payment Link',
          'Raising Total Seats auto-promotes waitlisted people',
        ],
      },
      {
        href: '/admin/collections/private-group-bookings',
        label: 'Private Group Bookings',
        bullets: [
          'Set up a private session for a group at a custom per-seat price',
          'Send each member a Square payment link, or record payment collected manually',
        ],
      },
      {
        href: '/admin/collections/pending-bookings',
        label: 'Pending Bookings',
        bullets: [
          'Checkouts that were started — paid ones become Completed, unpaid ones Expire',
          'Failed records (paid but booking errored) can be retried here',
          'Expired records double as a prospect list you can email',
        ],
      },
      {
        href: '/admin/collections/bookings',
        label: 'Bookings',
        bullets: [
          'The master registration list — one record per attendee per session',
          'Cancel here to automatically refund (if paid online) and free the seat',
          'Payment method and amount paid feed the accounting reports',
        ],
      },
      {
        href: '/admin/collections/attendees',
        label: 'Attendees',
        bullets: [
          'Every person who has booked — name, email, phone',
          'One record per person, shared across all their bookings',
        ],
      },
      {
        href: '/admin/collections/instructors',
        label: 'Instructors',
        bullets: [
          'Instructor profiles that get assigned to sessions',
        ],
      },
    ],
  },
  {
    label: 'Accounting & Reports',
    links: [
      {
        href: '/admin/reporting/dashboard',
        label: 'Overview',
        bullets: [
          'Revenue totals and charts at a glance',
        ],
      },
      {
        href: '/admin/reporting/revenue',
        label: 'Revenue Report',
        bullets: [
          'Every paid booking with amount, discount, and payment method',
          'Filter by time period and export to CSV',
        ],
      },
      {
        href: '/admin/reporting/bookings',
        label: 'Bookings Report',
        bullets: [
          'Booking counts broken down by course and session',
        ],
      },
      {
        href: '/admin/reporting/refunds',
        label: 'Refunds & Cancellations',
        bullets: [
          'Cancelled bookings and any refunds issued',
        ],
      },
      {
        href: '/admin/collections/discount-codes',
        label: 'Discount Codes',
        bullets: [
          'Percent or dollar-off codes customers enter at checkout',
          'Limit to specific courses, set an expiration date or usage cap',
          'Usage is counted automatically when someone pays',
          'Never create coupons inside Square itself — they bypass the website',
        ],
      },
      {
        href: '/admin/globals/e-commerce',
        label: 'E-Commerce',
        bullets: [
          'The card-processing surcharge added to online payments',
          'Includes the operations guide for manual payments and refunds',
        ],
      },
    ],
  },
  {
    label: 'Data',
    links: [
      {
        href: '/admin/collections/contact-submissions',
        label: 'Contact Submissions',
        bullets: [
          'Messages sent through the website contact form',
          'Status flips from New to Read when you open one',
        ],
      },
    ],
  },
  {
    label: 'Page Content',
    links: [
      {
        href: '/admin/globals/home-page',
        label: 'About Page',
        bullets: [
          'Content for the About page — carousel, featured courses, testimonials, badges',
        ],
      },
      {
        href: '/admin/globals/courses-page',
        label: 'Courses Page',
        bullets: [
          'Hero and layout of the course catalog page',
        ],
      },
      {
        href: '/admin/globals/applications-page',
        label: 'Applications Page',
        bullets: [
          'Hero and content of the license applications page',
        ],
      },
      {
        href: '/admin/globals/store-page',
        label: 'Store Page',
        bullets: [
          'The site’s landing page — products, sections, and pricing display',
        ],
      },
      {
        href: '/admin/globals/contact-settings',
        label: 'Contact Page',
        bullets: [
          'Contact page content, map, and the topics in the form dropdown',
        ],
      },
    ],
  },
  {
    label: 'Configuration',
    links: [
      {
        href: '/admin/globals/site-settings',
        label: 'Site Settings',
        bullets: [
          'Logos, navigation, social links, and SEO defaults',
          'The contact phone number here appears in all outgoing email footers',
        ],
      },
      {
        href: '/admin/globals/utility',
        label: 'Site Utilities',
        bullets: [
          'Sitewide behavior settings (e.g. carousel timing)',
        ],
      },
    ],
  },
  {
    label: 'Collections',
    links: [
      {
        href: '/admin/collections/users',
        label: 'Users',
        bullets: [
          'Admin accounts that can log in to this CMS',
        ],
      },
      {
        href: '/admin/collections/media',
        label: 'Media',
        bullets: [
          'All uploaded images and files',
          'Images are compressed automatically on upload',
        ],
      },
      {
        href: '/admin/collections/badges',
        label: 'Badges',
        bullets: [
          'Certification and affiliation badges shown on the website',
        ],
      },
    ],
  },
]

export default function AdminDashboard() {
  return (
    <div style={{
      padding: '0 4.5rem',
      maxWidth: '960px',
    }}>
      <h1 style={{
        fontSize: '24px',
        fontWeight: 700,
        marginBottom: '2rem',
        color: 'var(--theme-text)',
      }}>
        Dashboard
      </h1>

      <ResendQuotaWidget />

      {/* Google Analytics link */}
      <div className="adash-note">
        For detailed traffic and behaviour analytics, visit{' '}
        <a
          href="https://analytics.google.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#ea580c', textDecoration: 'underline' }}
        >
          Google Analytics
        </a>
        .{' '}
        You must be signed in with <strong>103tactical.developer@gmail.com</strong> to access the property.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', paddingBottom: '3rem' }}>
        {SECTIONS.map((section) => (
          <div key={section.label}>
            {/* Solid orange header bar with knockout text — fixed brand colors,
                identical in light and dark mode */}
            <div style={{
              background: '#ea580c',
              borderRadius: '6px',
              padding: '9px 14px',
              marginBottom: '14px',
            }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#ffffff',
              }}>
                {section.label}
              </span>
            </div>

            {/* Link cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '8px',
              alignItems: 'start',
            }}>
              {section.links.map((link) => (
                <div key={link.href} className="adash-card">
                  <Link
                    href={link.href}
                    prefetch={false}
                    className="adash-card__link"
                  >
                    {link.label}
                  </Link>
                  <details className="adash-card__info">
                    <summary>About</summary>
                    <ul>
                      {link.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </details>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
