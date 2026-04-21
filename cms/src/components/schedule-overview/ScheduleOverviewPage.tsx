import React from 'react'
import { DefaultTemplate } from '@payloadcms/next/templates'
import ScheduleCalendarClient from './ScheduleCalendarClient'

// ── Serialisable types shared with the client component ──────────────────────

export type SessionInfo = {
  id: string | null
  date: string | null      // ISO datetime stored as UTC midnight (day-only picker)
  startTime: string | null // ISO datetime (time-only picker)
  endTime: string | null
}

export type ScheduleItem = {
  id: number
  courseId: number | null
  courseTitle: string
  displayLabel: string | null
  sessions: SessionInfo[]
  maxSeats: number
  seatsBooked: number
  isActive: boolean
}

// ── Server component ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function ScheduleOverviewPage(props: any) {
  const { initPageResult } = props
  const params       = await Promise.resolve(props.params       ?? {})
  const searchParams = await Promise.resolve(props.searchParams ?? {})
  const payload      = initPageResult.req.payload

  // Fetch ALL schedules — read-only, no migrations, depth=1 populates course.title
  const { docs } = await payload.find({
    collection: 'course-schedules',
    limit: 0,          // 0 = no limit in Payload v3
    depth: 1,
    overrideAccess: true,
  })

  // Serialise to plain objects safe to pass across the server/client boundary
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schedules: ScheduleItem[] = (docs as any[]).map((s) => {
    const course = s.course && typeof s.course === 'object' ? s.course : null
    return {
      id:           s.id as number,
      courseId:     course?.id ?? null,
      courseTitle:  course?.title ?? 'Unknown Course',
      displayLabel: s.displayLabel ?? s.label ?? null,
      sessions: ((s.sessions ?? []) as any[]).map((sess) => ({
        id:        sess.id    ?? null,
        date:      sess.date  ?? null,
        startTime: sess.startTime ?? null,
        endTime:   sess.endTime   ?? null,
      })),
      maxSeats:   s.maxSeats    ?? 0,
      seatsBooked: s.seatsBooked ?? 0,
      isActive:   s.isActive    ?? false,
    }
  })

  return (
    <DefaultTemplate
      i18n={initPageResult.req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={initPageResult.req.payload}
      permissions={initPageResult.permissions}
      searchParams={searchParams}
      user={initPageResult.req.user ?? undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
      <div style={{
        paddingLeft:   'var(--gutter-h, 24px)',
        paddingRight:  'var(--gutter-h, 24px)',
        paddingBottom: '60px',
        paddingTop:    '20px',
      }}>
        <h1 style={{
          fontSize: '22px', fontWeight: 700,
          color: 'var(--theme-text)',
          margin: '0 0 28px',
        }}>
          Schedule Overview
        </h1>
        <ScheduleCalendarClient schedules={schedules} />
      </div>
    </DefaultTemplate>
  )
}
