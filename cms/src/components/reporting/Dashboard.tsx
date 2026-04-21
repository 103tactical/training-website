import React from 'react'
import { DefaultTemplate } from '@payloadcms/next/templates'
import DashboardCharts from './DashboardCharts'
import type { RevenueMonth, CourseStat } from './DashboardCharts'
import { formatCents, formatDate, getCourseName, getAttendeeName } from './shared'
import type { RawBooking } from './shared'

// ── Stat card ──────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, accent,
}: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div style={{
      background: 'var(--theme-elevation-100, #1a1a1a)',
      borderRadius: '8px',
      padding: '18px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }}>
      <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--theme-elevation-500, #888)' }}>
        {label}
      </span>
      <span style={{ fontSize: '26px', fontWeight: 700, color: accent ? '#b91c1c' : 'var(--theme-text)' }}>
        {value}
      </span>
      {sub && <span style={{ fontSize: '12px', color: 'var(--theme-elevation-500, #888)' }}>{sub}</span>}
    </div>
  )
}

// ── Fill bar for upcoming sessions ─────────────────────────────────────────

function FillBar({ booked, max }: { booked: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((booked / max) * 100)) : 0
  const color = pct >= 90 ? '#b91c1c' : pct >= 70 ? '#d97706' : '#16a34a'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
      <div style={{ flex: 1, height: '6px', background: 'var(--theme-elevation-200, #333)', borderRadius: '3px' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '11px', color: 'var(--theme-elevation-500, #888)', whiteSpace: 'nowrap' }}>
        {booked} / {max}
      </span>
    </div>
  )
}

// ── Quick link ─────────────────────────────────────────────────────────────

function QuickLink({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <a href={href} style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      padding: '16px 20px',
      background: 'var(--theme-elevation-100, #1a1a1a)',
      borderRadius: '8px',
      textDecoration: 'none',
      color: 'inherit',
      border: '1px solid transparent',
      transition: 'border-color 0.15s',
    }}>
      <span style={{ fontWeight: 600, color: 'var(--theme-text)' }}>{label} →</span>
      <span style={{ fontSize: '12px', color: 'var(--theme-elevation-500, #888)' }}>{desc}</span>
    </a>
  )
}

// ── Section heading ────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: '13px', fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '0.07em', color: 'var(--theme-elevation-500, #888)',
      margin: '0 0 12px',
    }}>
      {children}
    </h2>
  )
}

// ── Dashboard ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function Dashboard(props: any) {
  const { initPageResult } = props
  const params       = await Promise.resolve(props.params)
  const searchParams = await Promise.resolve(props.searchParams)
  const payload      = initPageResult.req.payload

  // Fetch all bookings with course + attendee populated
  const { docs: bookings } = await payload.find({
    collection: 'bookings',
    limit: 0,
    depth: 1,
    overrideAccess: true,
  }) as { docs: RawBooking[] }

  // Fetch all course schedules (for upcoming sessions)
  const { docs: schedules } = await payload.find({
    collection: 'course-schedules',
    limit: 0,
    depth: 1,
    overrideAccess: true,
  }) as { docs: RawBooking[] }

  // ── Compute metrics ────────────────────────────────────────────────────────

  const now         = new Date()
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1)
  const yearStart   = new Date(now.getFullYear(), 0, 1)

  const confirmed = bookings.filter(b => b.status === 'confirmed')
  const cancelled = bookings.filter(b => b.status === 'cancelled')
  const waitlisted = bookings.filter(b => b.status === 'waitlisted')

  const totalRevenue      = confirmed.reduce((s, b) => s + (b.amountPaidCents ?? 0), 0)
  const monthRevenue      = confirmed.filter(b => new Date(b.createdAt) >= monthStart)
                                     .reduce((s, b) => s + (b.amountPaidCents ?? 0), 0)
  const yearRevenue       = confirmed.filter(b => new Date(b.createdAt) >= yearStart)
                                     .reduce((s, b) => s + (b.amountPaidCents ?? 0), 0)
  const totalRefunded     = cancelled.filter(b => b.squarePaymentId)
                                     .reduce((s, b) => s + (b.amountPaidCents ?? 0), 0)
  const avgBooking        = confirmed.length > 0
    ? Math.round(totalRevenue / confirmed.length)
    : 0

  // Revenue by month — last 12 months
  const months: Record<string, number> = {}
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    months[key] = 0
  }
  for (const b of confirmed) {
    if (!b.amountPaidCents) continue
    const d = new Date(b.createdAt)
    const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    if (key in months) months[key] += b.amountPaidCents
  }
  const revenueByMonth: RevenueMonth[] = Object.entries(months).map(([month, revenue]) => ({ month, revenue }))

  // Bookings by course
  const courseMap: Record<string, number> = {}
  for (const b of confirmed) {
    const name = getCourseName(b)
    courseMap[name] = (courseMap[name] ?? 0) + 1
  }
  const bookingsByCourse: CourseStat[] = Object.entries(courseMap)
    .map(([course, count]) => ({ course, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // Upcoming sessions (next 60 days)
  const in60 = new Date(now)
  in60.setDate(now.getDate() + 60)

  const upcomingSessions = schedules
    .filter(s => {
      const sessions: { date?: string }[] = s.sessions ?? []
      if (!sessions.length) return false
      const first = sessions[0].date ? new Date(sessions[0].date) : null
      return first && first >= now && first <= in60
    })
    .sort((a, b) => {
      const aDate = a.sessions?.[0]?.date ?? ''
      const bDate = b.sessions?.[0]?.date ?? ''
      return aDate < bDate ? -1 : 1
    })
    .slice(0, 8)

  // Recent bookings (last 10 confirmed)
  const recentBookings = [...confirmed]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)

  // ── Render ─────────────────────────────────────────────────────────────────

  const wrap: React.CSSProperties = {
    maxWidth: '1400px',
    paddingLeft: 'var(--gutter-h, 24px)',
    paddingRight: 'var(--gutter-h, 24px)',
    paddingBottom: '48px',
  }

  const grid4: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '16px',
  }

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  }

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '8px 12px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--theme-elevation-500, #888)',
  }

  const tdStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: '1px solid var(--theme-elevation-100, #222)',
    color: 'var(--theme-text)',
  }

  return (
    <DefaultTemplate
      i18n={initPageResult.req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={payload}
      permissions={initPageResult.permissions}
      req={initPageResult.req}
      searchParams={searchParams}
      user={initPageResult.req.user ?? undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
    <div style={wrap}>
      <div style={{ marginBottom: '28px', paddingTop: '8px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 700 }}>Accounting & Reports</h1>
        <p style={{ margin: 0, color: 'var(--theme-elevation-500, #888)', fontSize: '14px' }}>
          Revenue, bookings, and session performance overview.
        </p>
      </div>

      {/* ── Revenue metrics ── */}
      <SectionHeading>Revenue</SectionHeading>
      <div style={grid4}>
        <StatCard label="Total Revenue"     value={formatCents(totalRevenue)} sub="All confirmed bookings" />
        <StatCard label="This Month"        value={formatCents(monthRevenue)} />
        <StatCard label="This Year"         value={formatCents(yearRevenue)} />
        <StatCard label="Total Refunded"    value={formatCents(totalRefunded)} sub="Square-processed only" accent />
      </div>

      {/* ── Booking metrics ── */}
      <SectionHeading>Bookings</SectionHeading>
      <div style={{ ...grid4, marginBottom: '28px' }}>
        <StatCard label="Confirmed"         value={String(confirmed.length)} sub="All time" />
        <StatCard label="Waitlisted"        value={String(waitlisted.length)} />
        <StatCard label="Cancellations"     value={String(cancelled.length)} />
        <StatCard label="Avg Booking Value" value={formatCents(avgBooking)} sub="Confirmed only" />
      </div>

      {/* ── Charts ── */}
      <SectionHeading>Trends</SectionHeading>
      <DashboardCharts revenueByMonth={revenueByMonth} bookingsByCourse={bookingsByCourse} />

      {/* ── Upcoming sessions ── */}
      <SectionHeading>Upcoming Sessions (Next 60 Days)</SectionHeading>
      <div style={{ background: 'var(--theme-elevation-100, #1a1a1a)', borderRadius: '8px', overflow: 'hidden', marginBottom: '28px' }}>
        {upcomingSessions.length === 0 ? (
          <p style={{ padding: '20px', color: 'var(--theme-elevation-500, #888)', fontSize: '13px', margin: 0 }}>
            No upcoming sessions in the next 60 days.
          </p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                {['Course', 'Session', 'First Date', 'Fill Rate'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {upcomingSessions.map((s, i) => {
                const course = s.course && typeof s.course === 'object' ? s.course.title : '—'
                const label  = s.displayLabel ?? s.label ?? '—'
                const firstDate = s.sessions?.[0]?.date ? formatDate(s.sessions[0].date) : '—'
                const booked = s.seatsBooked ?? 0
                const max    = s.maxSeats ?? 0
                return (
                  <tr key={i} className="rpt-row">
                    <td style={tdStyle}>{course}</td>
                    <td style={tdStyle}>{label}</td>
                    <td style={tdStyle}>{firstDate}</td>
                    <td style={{ ...tdStyle, minWidth: '180px' }}>
                      <FillBar booked={booked} max={max} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Recent bookings ── */}
      <SectionHeading>Recent Bookings</SectionHeading>
      <div style={{ background: 'var(--theme-elevation-100, #1a1a1a)', borderRadius: '8px', overflow: 'hidden', marginBottom: '32px' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {['Date', 'Attendee', 'Course', 'Session', 'Amount'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentBookings.map((b, i) => (
              <tr key={i}>
                <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(b.createdAt)}</td>
                <td style={tdStyle}>{getAttendeeName(b)}</td>
                <td style={tdStyle}>{getCourseName(b)}</td>
                <td style={tdStyle}>{
                  b.courseSchedule && typeof b.courseSchedule === 'object'
                    ? (b.courseSchedule.displayLabel ?? b.courseSchedule.label ?? '—')
                    : '—'
                }</td>
                <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatCents(b.amountPaidCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Quick links to reports ── */}
      <SectionHeading>Reports</SectionHeading>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <QuickLink href="/admin/reporting/revenue"  label="Revenue Report"          desc="Revenue by period with CSV export" />
        <QuickLink href="/admin/reporting/bookings" label="Bookings Report"         desc="All bookings filtered by status and date" />
        <QuickLink href="/admin/reporting/refunds"  label="Refunds & Cancellations" desc="Cancelled bookings and refund totals" />
      </div>
    </div>
    </DefaultTemplate>
  )
}
