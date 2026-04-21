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
export default async function RefundsReport(props: any) {
  const { initPageResult } = props
  const params   = await Promise.resolve(props.params)
  const rawSP    = await Promise.resolve(props.searchParams ?? {})
  const sp       = rawSP as Record<string, string | string[]>
  const get      = (k: string) => Array.isArray(sp[k]) ? (sp[k] as string[])[0] : sp[k] as string | undefined

  const period = get('period') ?? 'all-time'
  const { from, to } = getDateRange(period, get('start'), get('end'))
  const payload = initPageResult.req.payload

  const dateFilter = period !== 'all-time'
    ? [
        { updatedAt: { greater_than_equal: from.toISOString() } },
        { updatedAt: { less_than_equal:    to.toISOString()   } },
      ]
    : []

  const { docs: cancellations } = await payload.find({
    collection: 'bookings',
    where: {
      and: [
        { status: { equals: 'cancelled' } },
        ...dateFilter,
      ],
    },
    limit: 0,
    depth: 1,
    overrideAccess: true,
    sort: '-updatedAt',
  }) as { docs: RawBooking[] }

  const squareRefunds    = cancellations.filter(b => b.squarePaymentId && b.amountPaidCents)
  const totalRefunded    = squareRefunds.reduce((s, b) => s + (b.amountPaidCents ?? 0), 0)
  const manualCancels    = cancellations.filter(b => !b.squarePaymentId)

  const csvHeaders = ['Date Cancelled', 'Attendee', 'Email', 'Course', 'Session', 'Amount Refunded', 'Square Order ID', 'Square Payment ID']
  const csvRows = cancellations.map(b => [
    formatDate(b.updatedAt),
    getAttendeeName(b),
    getAttendeeEmail(b),
    getCourseName(b),
    getSessionLabel(b),
    b.amountPaidCents != null ? (b.amountPaidCents / 100).toFixed(2) : '',
    b.squareOrderId   ?? '',
    b.squarePaymentId ?? '',
  ])

  const periodLabel = PERIOD_LABELS[period] ?? 'Custom Range'
  const filename    = `refunds-${period}-${new Date().toISOString().slice(0, 10)}.csv`
  const customStart = get('start')
  const customEnd   = get('end')

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
    <SetStepNav nav={[{ label: 'Refunds & Cancellations' }]} />
    <div style={{ maxWidth: '1400px', paddingLeft: 'var(--gutter-h, 24px)', paddingRight: 'var(--gutter-h, 24px)', paddingBottom: '48px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', paddingTop: '8px', gap: '16px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 700 }}>Refunds & Cancellations</h1>
          <p style={{ margin: 0, color: 'var(--theme-elevation-500, #888)', fontSize: '14px' }}>
            {periodLabel} · {cancellations.length} {cancellations.length === 1 ? 'cancellation' : 'cancellations'}
          </p>
        </div>
        <CsvButton headers={csvHeaders} rows={csvRows} filename={filename} label="Export CSV" />
      </div>

      {/* Period tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {PERIODS.map(p => (
          <a key={p} href={`?period=${p}`} style={{
            padding: '6px 14px', borderRadius: '4px', fontSize: '13px', textDecoration: 'none',
            background: p === period ? '#b91c1c' : 'var(--theme-elevation-100, #1a1a1a)',
            color: p === period ? '#fff' : 'var(--theme-text)',
            fontWeight: p === period ? 600 : 400,
          }}>
            {PERIOD_LABELS[p]}
          </a>
        ))}
        {/* Custom date form */}
        <form method="GET" style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: '8px' }}>
          <input type="hidden" name="period" value="custom" />
          <input type="date" name="start" defaultValue={customStart ?? ''} style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--theme-elevation-300)', background: 'var(--theme-elevation-100)', color: 'var(--theme-text)', fontSize: '12px' }} />
          <span style={{ color: 'var(--theme-elevation-500)', fontSize: '12px' }}>to</span>
          <input type="date" name="end" defaultValue={customEnd ?? ''} style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--theme-elevation-300)', background: 'var(--theme-elevation-100)', color: 'var(--theme-text)', fontSize: '12px' }} />
          <button type="submit" style={{ padding: '5px 12px', borderRadius: '4px', background: 'var(--theme-elevation-200)', border: 'none', color: 'var(--theme-text)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>Apply</button>
        </form>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div style={statCard}>
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--theme-elevation-500)' }}>Total Cancellations</span>
          <span style={{ fontSize: '26px', fontWeight: 700 }}>{cancellations.length}</span>
        </div>
        <div style={statCard}>
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--theme-elevation-500)' }}>Square Refunds</span>
          <span style={{ fontSize: '26px', fontWeight: 700, color: '#b91c1c' }}>{formatCents(totalRefunded)}</span>
          <span style={{ fontSize: '12px', color: 'var(--theme-elevation-500)' }}>{squareRefunds.length} transactions</span>
        </div>
        <div style={statCard}>
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--theme-elevation-500)' }}>Manual Cancellations</span>
          <span style={{ fontSize: '26px', fontWeight: 700 }}>{manualCancels.length}</span>
          <span style={{ fontSize: '12px', color: 'var(--theme-elevation-500)' }}>No Square refund</span>
        </div>
        <div style={statCard}>
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--theme-elevation-500)' }}>Avg Refund</span>
          <span style={{ fontSize: '26px', fontWeight: 700 }}>
            {squareRefunds.length > 0 ? formatCents(Math.round(totalRefunded / squareRefunds.length)) : '—'}
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--theme-elevation-100, #1a1a1a)', borderRadius: '8px', overflow: 'hidden' }}>
        {cancellations.length === 0 ? (
          <p style={{ padding: '20px', color: 'var(--theme-elevation-500)', fontSize: '13px', margin: 0 }}>
            No cancellations found for this period.
          </p>
        ) : (
          <table style={tableStyle}>
            <thead><tr>
              {['Date Cancelled', 'Attendee', 'Course', 'Session', 'Amount Refunded', 'Square Order'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {cancellations.map((b, i) => (
                <tr key={i} className="rpt-row">
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(b.updatedAt)}</td>
                  <td style={tdStyle}>{getAttendeeName(b)}</td>
                  <td style={tdStyle}>{getCourseName(b)}</td>
                  <td style={tdStyle}>{getSessionLabel(b)}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: b.squarePaymentId ? '#b91c1c' : 'var(--theme-elevation-500)' }}>
                    {b.squarePaymentId ? formatCents(b.amountPaidCents) : 'Manual'}
                  </td>
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
