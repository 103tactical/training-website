'use client'
import React from 'react'
import Link from 'next/link'
import { NavGroup } from '@payloadcms/ui'

export default function CourseOverviewNav() {
  return (
    <NavGroup label="Course Tools">
      <Link href="/admin/schedule-overview" className="nav__link">
        <span className="nav__link-label">Schedule Overview</span>
      </Link>
    </NavGroup>
  )
}
