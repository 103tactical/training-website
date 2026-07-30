import React from 'react'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { SetStepNav } from '@payloadcms/ui'
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
  /** Outstanding admin-sent payment links holding seats (not yet paid) */
  seatsHeld: number
  isActive: boolean
}

/** Active course + sensible defaults (from its most recent schedule) for the
 *  add-session form on the calendar. */
export type CourseOption = {
  id: number
  title: string
  durationDays: number
  defaultStartTime: string | null // ISO — from the course's latest schedule
  defaultEndTime: string | null
  defaultMaxSeats: number | null
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

  // Outstanding admin-sent payment links, grouped per schedule — each one
  // holds a seat in the website's availability
  const holdMap: Record<number, number> = {}
  try {
    const pend = await payload.find({
      collection: 'pending-bookings',
      where: {
        and: [
          { status: { equals: 'pending' } },
          { source: { equals: 'admin-link' } },
        ],
      },
      limit: 0,
      depth: 0,
      overrideAccess: true,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const pb of pend.docs as any[]) {
      const sid = typeof pb.courseSchedule === 'object' && pb.courseSchedule !== null
        ? pb.courseSchedule.id
        : pb.courseSchedule
      if (sid) holdMap[sid] = (holdMap[sid] ?? 0) + 1
    }
  } catch {
    // Non-fatal — calendar renders without hold badges
  }

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
      seatsHeld:  holdMap[s.id as number] ?? 0,
      isActive:   s.isActive    ?? false,
    }
  })

  // Active courses + per-course defaults for the calendar's add-session form.
  // Defaults come from the course's most recent existing schedule so a new
  // session starts pre-filled with the times/seats the admin last used.
  let courseOptions: CourseOption[] = []
  try {
    const coursesRes = await payload.find({
      collection: 'courses',
      where: { isActive: { equals: true } },
      limit: 0,
      depth: 0,
      sort: 'title',
      overrideAccess: true,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    courseOptions = (coursesRes.docs as any[]).map((c) => {
      const own = schedules
        .filter((s) => s.courseId === c.id && s.sessions.length > 0)
        .sort((a, b) => {
          const ad = a.sessions.map((x) => x.date ?? '').sort().reverse()[0] ?? ''
          const bd = b.sessions.map((x) => x.date ?? '').sort().reverse()[0] ?? ''
          return bd.localeCompare(ad)
        })
      const latest = own[0]
      const firstSession = latest?.sessions
        .slice()
        .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))[0]
      return {
        id: c.id as number,
        title: (c.title as string) ?? 'Untitled Course',
        durationDays: typeof c.durationDays === 'number' && c.durationDays > 0 ? c.durationDays : 1,
        defaultStartTime: firstSession?.startTime ?? null,
        defaultEndTime: firstSession?.endTime ?? null,
        defaultMaxSeats: latest?.maxSeats ?? null,
      }
    })
  } catch {
    // Non-fatal — the form falls back to generic defaults
  }

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
      <SetStepNav nav={[{ label: 'Course Calendar' }]} />
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
          Course Calendar
        </h1>
        <ScheduleCalendarClient schedules={schedules} courses={courseOptions} />
      </div>
    </DefaultTemplate>
  )
}
