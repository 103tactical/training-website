'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logout, NavGroup, useNav } from '@payloadcms/ui'

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      prefetch={false}
      className={['nav__link', isActive ? 'nav__link--active' : ''].filter(Boolean).join(' ')}
    >
      <span className="nav__link-label">{label}</span>
    </Link>
  )
}

export default function CustomNav() {
  const { hydrated, navOpen, navRef, shouldAnimate } = useNav()

  const asideClass = [
    'nav',
    navOpen    && 'nav--nav-open',
    shouldAnimate && 'nav--nav-animate',
    hydrated   && 'nav--nav-hydrated',
  ].filter(Boolean).join(' ')

  return (
    <aside
      className={asideClass}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...({ inert: !navOpen ? '' : undefined } as any)}
    >
      <div className="nav__scroll" ref={navRef as unknown as React.RefObject<HTMLDivElement>}>
        <nav className="nav__wrap">

          <NavGroup label="Course Management">
            <NavLink href="/admin/schedule-dashboard"                          label="Course Calendar" />
            <NavLink href="/admin/collections/courses"                         label="Courses" />
            <NavLink href="/admin/collections/course-groups"                   label="Course Groups" />
            <NavLink href="/admin/collections/course-schedules"                label="Course Schedules" />
            <NavLink href="/admin/collections/private-group-bookings"          label="Private Group Bookings" />
            <NavLink href="/admin/collections/pending-bookings"                label="Pending Bookings" />
            <NavLink href="/admin/collections/bookings"                        label="Bookings" />
            <NavLink href="/admin/collections/attendees"                       label="Attendees" />
            <NavLink href="/admin/collections/instructors"                     label="Instructors" />
          </NavGroup>

          <NavGroup label="Accounting & Reports">
            <NavLink href="/admin/reporting/dashboard"  label="Overview" />
            <NavLink href="/admin/reporting/revenue"    label="Revenue Report" />
            <NavLink href="/admin/reporting/bookings"   label="Bookings Report" />
            <NavLink href="/admin/reporting/refunds"    label="Refunds & Cancellations" />
          </NavGroup>

          <NavGroup label="Data">
            <NavLink href="/admin/collections/contact-submissions" label="Contact Submissions" />
          </NavGroup>

          <NavGroup label="Page Content">
            <NavLink href="/admin/globals/home-page"          label="Home Page" />
            <NavLink href="/admin/globals/courses-page"       label="Courses Page" />
            <NavLink href="/admin/globals/applications-page"  label="Applications Page" />
            <NavLink href="/admin/globals/store-page"         label="Store Page" />
            <NavLink href="/admin/globals/contact-settings"   label="Contact Page" />
          </NavGroup>

          <NavGroup label="Configuration">
            <NavLink href="/admin/globals/site-settings" label="Site Settings" />
            <NavLink href="/admin/globals/utility"       label="Site Utilities" />
          </NavGroup>

          <NavGroup label="Collections">
            <NavLink href="/admin/collections/users"  label="Users" />
            <NavLink href="/admin/collections/media"  label="Media" />
            <NavLink href="/admin/collections/badges" label="Badges" />
          </NavGroup>

          <div className="nav-group">
            <div className="nav-group__toggle" style={{ cursor: 'default', pointerEvents: 'none' }}>
              <div className="nav-group__label">Logout</div>
            </div>
            <div className="nav-group__content">
              <Logout />
            </div>
          </div>

        </nav>
      </div>
    </aside>
  )
}
