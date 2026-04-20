import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import CsvButton from './CsvButton'
import {
  formatCents, formatDate, getDateRange, getCourseName,
  getAttendeeName, getAttendeeEmail, getSessionLabel,
  PERIOD_LABELS,
} from './shared'
import type { RawBooking } from './shared'

const PERIODS  = ['this-week', 'this-month', 'this-quarter', 'this-year', 'all-time']
const STATUSES = [
  { value: 'all',       label: 'All Statuses' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'waitlisted', label: 'Waitlisted' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_COLORS: Record<string, string> = {
  confirmed:  '#16a34a',
  waitlisted: '#d97706',
  cancelled:  '#b91c1c',
}

interface Props {
  searchParams?: { period?: string; status?: string; start?: string; end?: string }
}

export default async function BookingsReport({ searchParams }: Props) {
  const period = searchParams?.period ?? 'all-time'
  const status = searchParams?.status ?? 'all'
  const { from, to } = getDateRange(period, searchParams?.start, searchParams?.end)

  const payload = await getPayload({ config })

  const dateFilter = period !== 'all-time'
    ? [
        { createdAt: { greater_than_equal: from.toISOString() } },
        { createdAt: { less_than_equal:    to.toISOString()   } },
      ]
    : []

  const statusFilter = status !== 'all'
    ? [{ status: { equals: status } }]
    : []

  const andClauses = [...dateFilter, ...statusFilter]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereClause: any = andClauses.length > 0 ? { and: andClauses } : undefined

  const { docs: bookings } = await payload.find({
    collection: 'bookings',
    where: whereClause,
    limit: 0,
    depth: 1,
    overrideAccess: true,
    sort: '-createdAt',
  }) as { docs: RawBooking[] }

  const confirmed  = bookings.filter(b => b.status === 'confirmed')
  const waitlisted = bookings.filter(b => b.status === 'waitlisted')
  const cancelled  = bookings.filter(b => b.status === 'cancelled')
  const totalRevenue = confirmed.reduce((s, b) => s + (b.amountPaidCents ?? 0), 0)

  const csvHeaders = ['Date', 'Attendee', 'Email', 'Course', 'Session', 'Status', 'Amount', 'Square Order']
  const csvRows = bookings.map(b => [
    formatDate(b.createdAt),
    getAttendeeName(b),
    getAttendeeEmail(b),
    getCourseName(b),
    getSessionLabel(b),
    b.status,
    b.amountPaidCents != null ? (b.amountPaidCents / 100).toFixed(2) : '',
    b.squareOrderId ?? '',
  ])

  const periodLabel = PERIOD_LABELS[period] ?? 'Custom Range'
  const filename = `bookings-${period}-${status}-${new Date().toISOString().slice(0, 10)}.csv`

  const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '13px' }
  const thStyle: React.CSSProperties = {
    textAlign: 'left', padding: '8px 12px', fontSize: '11px', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    color: 'var(--theme-elevation-500, #888)',
    borderBottom: '1px solid var(--theme-elevation-200, #333)',
  }
  const tdStyle: React.CSSProperties = {
    padding: '10px 12px', borderBottom: '1px solid var(--theme-elevation-100, #222)',
    color: 'var(--theme-text)',
  }
  const statCard: React.CSSProperties = {
    background: 'var(--theme-elevation-100, #1a1a1a)', borderRadius: '8px',
    padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '4px',
  }
  const tabBase: React.CSSProperties = {
    padding: '6px 14px', borderRadius: '4px', fontSize: '13px', textDecoration: 'none',
  }

  return (
    <div style={{ padding: '0 var(--gutter-h, 24px) 48px', maxWidth: '1400px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', paddingTop: '8px', gap: '16px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 700 }}>Bookings Report</h1>
          <p style={{ margin: 0, color: 'var(--theme-elevation-500, #888)', fontSize: '14px' }}>
            {periodLabel} · {bookings.length} {bookings.length === 1 ? 'record' : 'records'}
          </p>
        </div>
        <CsvButton headers={csvHeaders} rows={csvRows} filename={filename} label="Export CSV" />
      </div>

      {/* Period tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {PERIODS.map(p => (
          <a key={p} href={`?period=${p}&status=${status}`} style={{
            ...tabBase,
            background: p === period ? '#b91c1c' : 'var(--theme-elevation-100, #1a1a1a)',
            color: p === period ? '#fff' : 'var(--theme-text)',
            fontWeight: p === period ? 600 : 400,
          }}>
            {PERIOD_LABELS[p]}
          </a>
        ))}
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {STATUSES.map(s => (
          <a key={s.value} href={`?period=${period}&status=${s.value}`} style={{
            ...tabBase,
            fontSize: '12px',
            background: s.value === status ? 'var(--theme-elevation-300, #444)' : 'var(--theme-elevation-100, #1a1a1a)',
            color: s.value === status ? 'var(--theme-text)' : 'var(--theme-elevation-500)',
            fontWeight: s.value === status ? 600 : 400,
          }}>
            {s.label}
          </a>
        ))}
        {/* Custom date form */}
        <form method="GET" style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: '8px' }}>
          <input type="hidden" name="period" value="custom" />
          <input type="hidden" name="status" value={status} />
          <input type="date" name="start" defaultValue={searchParams?.start ?? ''} style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--theme-elevation-300)', background: 'var(--theme-elevation-100)', color: 'var(--theme-text)', fontSize: '12px' }} />
          <span style={{ color: 'var(--theme-elevation-500)', fontSize: '12px' }}>to</span>
          <input type="date" name="end" defaultValue={searchParams?.end ?? ''} style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--theme-elevation-300)', background: 'var(--theme-elevation-100)', color: 'var(--theme-text)', fontSize: '12px' }} />
          <button type="submit" style={{ padding: '5px 12px', borderRadius: '4px', background: 'var(--theme-elevation-200)', border: 'none', color: 'var(--theme-text)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>Apply</button>
        </form>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div style={statCard}>
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--theme-elevation-500)' }}>Confirmed</span>
          <span style={{ fontSize: '26px', fontWeight: 700, color: '#16a34a' }}>{confirmed.length}</span>
        </div>
        <div style={statCard}>
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--theme-elevation-500)' }}>Waitlisted</span>
          <span style={{ fontSize: '26px', fontWeight: 700, color: '#d97706' }}>{waitlisted.length}</span>
        </div>
        <div style={statCard}>
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--theme-elevation-500)' }}>Cancelled</span>
          <span style={{ fontSize: '26px', fontWeight: 700, color: '#b91c1c' }}>{cancelled.length}</span>
        </div>
        <div style={statCard}>
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--theme-elevation-500)' }}>Revenue (Confirmed)</span>
          <span style={{ fontSize: '26px', fontWeight: 700 }}>{formatCents(totalRevenue)}</span>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--theme-elevation-100, #1a1a1a)', borderRadius: '8px', overflow: 'hidden' }}>
        {bookings.length === 0 ? (
          <p style={{ padding: '20px', color: 'var(--theme-elevation-500)', fontSize: '13px', margin: 0 }}>
            No bookings found for this filter.
          </p>
        ) : (
          <table style={tableStyle}>
            <thead><tr>
              {['Date', 'Attendee', 'Email', 'Course', 'Session', 'Status', 'Amount'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {bookings.map((b, i) => (
                <tr key={i}>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(b.createdAt)}</td>
                  <td style={tdStyle}>{getAttendeeName(b)}</td>
                  <td style={{ ...tdStyle, fontSize: '12px', color: 'var(--theme-elevation-500)' }}>{getAttendeeEmail(b)}</td>
                  <td style={tdStyle}>{getCourseName(b)}</td>
                  <td style={tdStyle}>{getSessionLabel(b)}</td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: `${STATUS_COLORS[b.status] ?? '#666'}22`,
                      color: STATUS_COLORS[b.status] ?? 'var(--theme-text)',
                    }}>
                      {b.status}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatCents(b.amountPaidCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
