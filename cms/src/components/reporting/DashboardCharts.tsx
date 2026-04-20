'use client'
import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

export interface RevenueMonth  { month: string; revenue: number }
export interface CourseStat    { course: string; count: number }

interface Props {
  revenueByMonth:    RevenueMonth[]
  bookingsByCourse:  CourseStat[]
}

const RED     = '#b91c1c'
const MUTED   = 'rgba(255,255,255,0.25)'
const CARD_BG = 'var(--theme-elevation-100, #1a1a1a)'

const tooltipStyle = {
  contentStyle: { background: '#1f1f1f', border: '1px solid #444', borderRadius: 6, fontSize: 12 },
  labelStyle:   { color: '#aaa' },
  itemStyle:    { color: '#fff' },
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: '0 0 12px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--theme-elevation-500, #888)' }}>
      {children}
    </p>
  )
}

export default function DashboardCharts({ revenueByMonth, bookingsByCourse }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>

      {/* Revenue by Month */}
      <div style={{ background: CARD_BG, borderRadius: '8px', padding: '20px 24px' }}>
        <SectionTitle>Revenue by Month — Last 12 Months</SectionTitle>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={revenueByMonth} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={(v: number) => `$${v >= 100000 ? `${(v/100000).toFixed(0)}k` : (v/100).toFixed(0)}`}
              tick={{ fontSize: 10, fill: MUTED }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              formatter={(v) => {
                const cents = typeof v === 'number' ? v : 0
                return [`$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Revenue']
              }}
              {...tooltipStyle}
            />
            <Bar dataKey="revenue" fill={RED} radius={[4, 4, 0, 0]} maxBarSize={40}>
              {revenueByMonth.map((_, i) => <Cell key={i} fill={RED} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bookings by Course */}
      <div style={{ background: CARD_BG, borderRadius: '8px', padding: '20px 24px' }}>
        <SectionTitle>Bookings by Course — All Time</SectionTitle>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={bookingsByCourse}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.07)" />
            <XAxis type="number" tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis
              dataKey="course"
              type="category"
              width={130}
              tick={{ fontSize: 10, fill: MUTED }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v) => [typeof v === 'number' ? v : 0, 'Bookings']}
              {...tooltipStyle}
            />
            <Bar dataKey="count" fill={RED} radius={[0, 4, 4, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}
