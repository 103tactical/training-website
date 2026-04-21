'use client'
import React from 'react'
import Link from 'next/link'
import { NavGroup } from '@payloadcms/ui'

export default function DataNav() {
  return (
    <NavGroup label="Data">
      <Link className="nav__link" href="/admin/collections/contact-submissions">
        <span className="nav__link-label">Contact Submissions</span>
      </Link>
    </NavGroup>
  )
}
