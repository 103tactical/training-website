import React from 'react'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { SetStepNav } from '@payloadcms/ui'
import CsvButton from './CsvButton'
import {
  formatCents, formatDate, getDateRange, getCourseName,
  getAttendeeName, getAttendeeEmail, getSessionLabel,
  PERIOD_LABELS,
} from './shared'
import type { RawBooking } from './shared'

const PERIODS = ['this-week', 'this-month', 'this-quarter', 'this-year', 'all-time']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function RevenueReport(props: any) {
  const { initPageResult } = props
  const params       = await Promise.resolve(props.params)
  const rawSP        = await Promise.resolve(props.searchParams ?? {})
  const sp           = rawSP as Record<string, string | string[]>
  const get          = (k: string) => Array.isArray(sp[k]) ? (sp[k] as string[])[0] : sp[k] as string | undefined

  const period = get('period') ?? 'all-time'
  const { from, to } = getDateRange(period, get('start'), get('end'))
  const payload = initPageResult.req.payload

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereClause: any = period === 'all-time'
    ? { status: { equals: 'confirmed' } }
    : {
        and: [
          { status:    { equals: 'confirmed' } },
          { createdAt: { greater_than_equal: from.toISOString() } },
          { createdAt: { less_than_equal:    to.toISOString()   } },
        ],
      }

  const { docs: bookings } = await payload.find({
    collection: 'bookings',
    where: whereClause,
    limit: 0,
    depth: 1,
    overrideAccess: true,
    sort: '-createdAt',
  }) as { docs: RawBooking[] }

  const totalRevenue   = bookings.reduce((s, b) => s + (b.amountPaidCents ?? 0), 0)
  const onlineBookings = bookings.filter(b => b.squareOrderId)
  const onlineRevenue  = onlineBookings.reduce((s, b) => s + (b.amountPaidCents ?? 0), 0)

  // Revenue by course breakdown
  const byCourse: Record<string, { count: number; revenue: number }> = {}
  for (const b of bookings) {
    const name = getCourseName(b)
    if (!byCourse[name]) byCourse[name] = { count: 0, revenue: 0 }
    byCourse[name].count++
    byCourse[name].revenue += b.amountPaidCents ?? 0
  }
  const courseBreakdown = Object.entries(byCourse).sort((a, b) => b[1].revenue - a[1].revenue)

  // CSV rows
  const csvHeaders = ['Date', 'Attendee', 'Email', 'Course', 'Session', 'Amount', 'Square Order ID']
  const csvRows = bookings.map(b => [
    formatDate(b.createdAt),
    getAttendeeName(b),
    getAttendeeEmail(b),
    getCourseName(b),
    getSessionLabel(b),
    b.amountPaidCents != null ? (b.amountPaidCents / 100).toFixed(2) : '',
    b.squareOrderId ?? '',
  ])

  // ── Styles ──────────────────────────────────────────────────────────────

  const wrap: React.CSSProperties = { maxWidth: '1400px', paddingLeft: 'var(--gutter-h, 24px)', paddingRight: 'var(--gutter-h, 24px)', paddingBottom: '48px' }
  const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '13px' }
  const thStyle: React.CSSProperties = {
    textAlign: 'left', padding: '8px 12px', fontSize: '11px', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    color: 'var(--theme-elevation-500, #888)',
  }
  const tdStyle: React.CSSProperties = {
    padding: '10px 12px', borderBottom: '1px solid var(--theme-elevation-100, #222)',
    color: 'var(--theme-text)',
  }
  const statCard: React.CSSProperties = {
    background: 'var(--theme-elevation-100, #1a1a1a)', borderRadius: '8px',
    padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '4px',
  }

  const periodLabel = PERIOD_LABELS[period] ?? 'Custom Range'
  const filename = `revenue-${period}-${new Date().toISOString().slice(0, 10)}.csv`
  const customStart = get('start')
  const customEnd   = get('end')

  return (
    <DefaultTemplate
      i18n={initPageResult.req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={payload}
      permissions={initPageResult.permissions}
      req={initPageResult.req}
      searchParams={rawSP}
      user={initPageResult.req.user ?? undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
    <SetStepNav nav={[{ label: 'Revenue Report' }]} />
    <div style={wrap}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', paddingTop: '8px', gap: '16px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 700 }}>Revenue Report</h1>
          <p style={{ margin: 0, color: 'var(--theme-elevation-500, #888)', fontSize: '14px' }}>
            {periodLabel} · {bookings.length} confirmed {bookings.length === 1 ? 'booking' : 'bookings'}
          </p>
        </div>
        <CsvButton headers={csvHeaders} rows={csvRows} filename={filename} label="Export CSV" />
      </div>

      {/* Period tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {PERIODS.map(p => (
          <a
            key={p}
            href={`?period=${p}`}
            style={{
              padding: '6px 14px',
              borderRadius: '4px',
              fontSize: '13px',
              textDecoration: 'none',
              background: p === 'all-time' ? '#ea580c' : p === period ? '#b91c1c' : 'var(--theme-elevation-100, #1a1a1a)',
              color: p === 'all-time' || p === period ? '#fff' : 'var(--theme-text)',
              fontWeight: p === 'all-time' || p === period ? 600 : 400,
            }}
          >
            {PERIOD_LABELS[p]}
          </a>
        ))}
        {/* Custom date range form */}
        <form method="GET" style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: '8px' }}>
          <input type="hidden" name="period" value="custom" />
          <input
            type="date"
            name="start"
            defaultValue={customStart ?? ''}
            style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--theme-elevation-300, #444)', background: 'var(--theme-elevation-100, #1a1a1a)', color: 'var(--theme-text)', fontSize: '12px' }}
          />
          <span style={{ color: 'var(--theme-elevation-500)', fontSize: '12px' }}>to</span>
          <input
            type="date"
            name="end"
            defaultValue={customEnd ?? ''}
            style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--theme-elevation-300, #444)', background: 'var(--theme-elevation-100, #1a1a1a)', color: 'var(--theme-text)', fontSize: '12px' }}
          />
          <button type="submit" style={{ padding: '5px 12px', borderRadius: '4px', background: 'var(--theme-elevation-200, #333)', border: 'none', color: 'var(--theme-text)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Apply
          </button>
        </form>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div style={statCard}>
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--theme-elevation-500)' }}>Total Revenue</span>
          <span style={{ fontSize: '26px', fontWeight: 700 }}>{formatCents(totalRevenue)}</span>
        </div>
        <div style={statCard}>
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--theme-elevation-500)' }}>Online (Square)</span>
          <span style={{ fontSize: '26px', fontWeight: 700 }}>{formatCents(onlineRevenue)}</span>
          <span style={{ fontSize: '12px', color: 'var(--theme-elevation-500)' }}>{onlineBookings.length} bookings</span>
        </div>
        <div style={statCard}>
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--theme-elevation-500)' }}>Other / Manual</span>
          <span style={{ fontSize: '26px', fontWeight: 700 }}>{formatCents(totalRevenue - onlineRevenue)}</span>
          <span style={{ fontSize: '12px', color: 'var(--theme-elevation-500)' }}>{bookings.length - onlineBookings.length} bookings</span>
        </div>
        <div style={statCard}>
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--theme-elevation-500)' }}>Avg Per Booking</span>
          <span style={{ fontSize: '26px', fontWeight: 700 }}>
            {bookings.length > 0 ? formatCents(Math.round(totalRevenue / bookings.length)) : '—'}
          </span>
        </div>
      </div>

      {/* By course breakdown */}
      {courseBreakdown.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--theme-elevation-500)', margin: '0 0 12px' }}>
            By Course
          </h2>
          <div style={{ background: 'var(--theme-elevation-100, #1a1a1a)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={tableStyle}>
              <thead><tr>
                {['Course', 'Bookings', 'Revenue', '% of Total'].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr></thead>
              <tbody>
                {courseBreakdown.map(([name, { count, revenue }], i) => (
                  <tr key={i} className="rpt-row">
                    <td style={tdStyle}>{name}</td>
                    <td style={tdStyle}>{count}</td>
                    <td style={tdStyle}>{formatCents(revenue)}</td>
                    <td style={tdStyle}>
                      {totalRevenue > 0 ? `${Math.round((revenue / totalRevenue) * 100)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transactions table */}
      <h2 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--theme-elevation-500)', margin: '0 0 12px' }}>
        Transactions
      </h2>
      <div style={{ background: 'var(--theme-elevation-100, #1a1a1a)', borderRadius: '8px', overflow: 'hidden' }}>
        {bookings.length === 0 ? (
          <p style={{ padding: '20px', color: 'var(--theme-elevation-500)', fontSize: '13px', margin: 0 }}>
            No confirmed bookings in this period.
          </p>
        ) : (
          <table style={tableStyle}>
            <thead><tr>
              {['Date', 'Attendee', 'Course', 'Session', 'Amount', 'Square Order'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {bookings.map((b, i) => (
                <tr key={i} className="rpt-row">
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(b.createdAt)}</td>
                  <td style={tdStyle}>{getAttendeeName(b)}</td>
                  <td style={tdStyle}>{getCourseName(b)}</td>
                  <td style={tdStyle}>{getSessionLabel(b)}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatCents(b.amountPaidCents)}</td>
                  <td style={{ ...tdStyle, fontSize: '11px', color: 'var(--theme-elevation-500)' }}>
                    {b.squareOrderId ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
    </DefaultTemplate>
  )
}
