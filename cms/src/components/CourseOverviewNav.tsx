'use client'
import React from 'react'
import Link from 'next/link'
import { NavGroup } from '@payloadcms/ui'

export default function CourseOverviewNav() {
  return (
    <NavGroup label="Course Management">
      <Link href="/admin/schedule-dashboard" className="nav__link">
        <span className="nav__link-label">Schedule Dashboard</span>
      </Link>
    </NavGroup>
  )
}
