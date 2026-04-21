'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import type { ScheduleItem } from './ScheduleOverviewPage'

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const PAGE_SIZE = 20

// ── Date helpers ──────────────────────────────────────────────────────────────

/** "2026-04-10T00:00:00Z" → "Apr 10, 2026" */
function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
}

/** "2026-04-10T00:00:00Z" → "Friday, April 10, 2026" */
function fmtDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
}

/** ISO datetime → "3:00 PM" (ET) */
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York',
  })
}

/** Return "YYYY-MM-DD" for a date-type ISO string */
function toDateKey(iso: string): string {
  return iso.slice(0, 10)
}

/** First session date string for sorting ("" if none) */
function firstDate(s: ScheduleItem): string {
  return s.sessions.map(x => x.date ?? '').filter(Boolean).sort()[0] ?? ''
}

// ── Calendar helpers ──────────────────────────────────────────────────────────

/** Map YYYY-MM-DD → schedules that have a session on that day */
function buildDateMap(schedules: ScheduleItem[]): Map<string, ScheduleItem[]> {
  const map = new Map<string, ScheduleItem[]>()
  for (const s of schedules) {
    for (const sess of s.sessions) {
      if (!sess.date) continue
      const key = toDateKey(sess.date)
      const arr = map.get(key) ?? []
      if (!arr.find(x => x.id === s.id)) arr.push(s)
      map.set(key, arr)
    }
  }
  return map
}

/** Returns an array of "YYYY-MM-DD" strings (or null for padding cells) */
function calendarGrid(year: number, month: number): (string | null)[] {
  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay()
  const days     = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const grid: (string | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= days; d++) {
    grid.push(
      `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    )
  }
  while (grid.length % 7 !== 0) grid.push(null)
  return grid
}

/** Today as YYYY-MM-DD in local wall-clock time (for visual highlight only) */
function todayKey(): string {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

// ── Print generator ───────────────────────────────────────────────────────────

function escape(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function generatePrintHTML(items: ScheduleItem[], filterLabel: string): string {
  const printDate = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York',
  })
  const rows = items.map(s => {
    const dates = s.sessions.map(x => x.date ? fmtDateShort(x.date) : '').filter(Boolean)
    const times = s.sessions.map(x => {
      if (!x.startTime && !x.endTime) return null
      const parts = [x.startTime && fmtTime(x.startTime), x.endTime && fmtTime(x.endTime)].filter(Boolean)
      return parts.join(' – ')
    }).filter(Boolean)
    return `<tr>
      <td>${escape(s.courseTitle)}</td>
      <td>${escape(s.displayLabel ?? '—')}</td>
      <td>${dates.map(escape).join('<br>')}</td>
      <td>${(times as string[]).map(escape).join('<br>')}</td>
      <td>${s.seatsBooked} / ${s.maxSeats}</td>
      <td>${s.isActive ? 'Active' : 'Inactive'}</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>Course Schedules — ${escape(filterLabel)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:20px}
  h1{font-size:16px;margin:0 0 4px}
  .meta{font-size:10px;color:#666;margin-bottom:16px}
  table{width:100%;border-collapse:collapse}
  thead th{background:#1a1a1a;color:#fff;padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px}
  tbody td{padding:5px 8px;border-bottom:1px solid #e0e0e0;vertical-align:top}
  tbody tr:nth-child(even) td{background:#f8f8f8}
  @page{margin:1.5cm}
</style></head><body>
<h1>103 Tactical Training — Course Schedules</h1>
<p class="meta">Filter: ${escape(filterLabel)} &nbsp;·&nbsp; Printed ${escape(printDate)} &nbsp;·&nbsp; ${items.length} schedule${items.length !== 1 ? 's' : ''}</p>
<table>
  <thead><tr>
    <th>Course</th><th>Session Label</th><th>Date(s)</th>
    <th>Time(s) ET</th><th>Seats (Booked / Total)</th><th>Status</th>
  </tr></thead>
  <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#999;">No schedules found.</td></tr>'}</tbody>
</table></body></html>`
}

// ── Day modal ─────────────────────────────────────────────────────────────────

function DayModal({
  dateStr, items, onClose,
}: { dateStr: string; items: ScheduleItem[]; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--theme-elevation-150,#1a1a1a)',
          border: '1px solid var(--theme-elevation-500,#333)',
          borderRadius: '10px', padding: '24px',
          width: '100%', maxWidth: '460px', maxHeight: '80vh', overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' }}>
          <h3 style={{ margin:0, fontSize:'15px', fontWeight:600, color:'var(--theme-text)' }}>
            {fmtDateLong(dateStr + 'T00:00:00Z')}
          </h3>
          <button
            onClick={onClose}
            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--theme-text)', fontSize:'22px', lineHeight:1, padding:'0 0 0 12px' }}
          >×</button>
        </div>

        {/* Sessions */}
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          {items.map(s => {
            const todaySessions = s.sessions.filter(x => x.date?.slice(0,10) === dateStr)
            return (
              <div key={s.id} style={{
                background:'var(--theme-elevation-200,#222)',
                borderRadius:'6px', padding:'12px',
              }}>
                <Link
                  href={`/admin/collections/course-schedules/${s.id}`}
                  style={{ fontWeight:600, fontSize:'13px', color:'var(--theme-text)', textDecoration:'none' }}
                >
                  {s.courseTitle}
                </Link>
                {s.displayLabel && (
                  <div style={{ fontSize:'12px', color:'var(--theme-elevation-500,#aaa)', marginTop:'2px' }}>
                    {s.displayLabel}
                  </div>
                )}
                {todaySessions.map((x, i) => (
                  (x.startTime || x.endTime) ? (
                    <div key={i} style={{ fontSize:'12px', color:'var(--theme-elevation-500,#aaa)', marginTop:'4px' }}>
                      {[x.startTime && fmtTime(x.startTime), x.endTime && fmtTime(x.endTime)].filter(Boolean).join(' – ')} ET
                    </div>
                  ) : null
                ))}
                <div style={{ fontSize:'11px', color:'var(--theme-elevation-500,#888)', marginTop:'6px' }}>
                  {s.seatsBooked} / {s.maxSeats} seats booked
                  {!s.isActive && <span style={{ marginLeft:'8px', color:'#f97316' }}>· Inactive</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Shared style constants ────────────────────────────────────────────────────

const btnBase: React.CSSProperties = {
  background: 'var(--theme-elevation-200,#222)',
  border: '1px solid var(--theme-elevation-500,#444)',
  borderRadius: '4px',
  color: 'var(--theme-text)',
  padding: '5px 12px',
  fontSize: '13px',
  cursor: 'pointer',
  lineHeight: 1.4,
}

const thSt: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left',
  borderBottom: '1px solid var(--theme-elevation-300,#2a2a2a)',
  color: 'var(--theme-elevation-500,#888)',
  fontSize: '11px', textTransform: 'uppercase',
  letterSpacing: '.5px', fontWeight: 600, whiteSpace: 'nowrap',
}

const tdSt: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid var(--theme-elevation-200,#1e1e1e)',
  color: 'var(--theme-text)',
  verticalAlign: 'top',
  fontSize: '13px',
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ScheduleCalendarClient({ schedules }: { schedules: ScheduleItem[] }) {
  const now = new Date()
  const [year,        setYear]        = useState(now.getFullYear())
  const [month,       setMonth]       = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [course,      setCourse]      = useState<string>('all')
  const [page,        setPage]        = useState(1)

  const TODAY = useMemo(() => todayKey(), [])

  // Calendar date → schedules map (all schedules, not filtered)
  const dateMap = useMemo(() => buildDateMap(schedules), [schedules])

  // Calendar grid for current month
  const grid = useMemo(() => calendarGrid(year, month), [year, month])

  // Unique courses for dropdown
  const courses = useMemo(() => {
    const map = new Map<string, number>()
    schedules.forEach(s => map.set(s.courseTitle, (map.get(s.courseTitle) ?? 0) + 1))
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [schedules])

  // Filtered + sorted schedule list
  const filtered = useMemo(() => {
    const base = course === 'all' ? schedules : schedules.filter(s => s.courseTitle === course)
    return [...base].sort((a, b) => firstDate(a).localeCompare(firstDate(b)))
  }, [schedules, course])

  const totalPages   = Math.ceil(filtered.length / PAGE_SIZE)
  const pageItems    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const filterLabel  = course === 'all' ? 'All Schedules' : course

  // Month navigation
  const prevMonth = () => month === 0  ? (setYear(y => y - 1), setMonth(11)) : setMonth(m => m - 1)
  const nextMonth = () => month === 11 ? (setYear(y => y + 1), setMonth(0))  : setMonth(m => m + 1)
  const goToday   = () => { setYear(now.getFullYear()); setMonth(now.getMonth()) }

  const handlePrint = () => {
    const html = generatePrintHTML(filtered, filterLabel)
    const win = window.open('', '_blank', 'width=960,height=700')
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 350) }
  }

  return (
    <>
      {/* ── Responsive styles injected once ── */}
      <style>{`
        .cal-cell { min-height: 90px; }
        .cal-pill { display: block; }
        .cal-dot  { display: none; }
        @media (max-width: 640px) {
          .cal-cell { min-height: 56px; padding: 4px !important; }
          .cal-pill { display: none; }
          .cal-dot  { display: flex; }
        }
      `}</style>

      {/* ════════════════════════════════════════════
          CALENDAR
      ════════════════════════════════════════════ */}
      <div style={{ marginBottom: '48px' }}>

        {/* Month header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px', flexWrap:'wrap', gap:'8px' }}>
          <h2 style={{ margin:0, fontSize:'18px', fontWeight:700, color:'var(--theme-text)' }}>
            {MONTHS[month]} {year}
          </h2>
          <div style={{ display:'flex', gap:'6px' }}>
            <button onClick={goToday}   style={btnBase}>Today</button>
            <button onClick={prevMonth} style={btnBase}>‹</button>
            <button onClick={nextMonth} style={btnBase}>›</button>
          </div>
        </div>

        {/* Day-of-week header row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:'1px' }}>
          {DOW.map(d => (
            <div key={d} style={{
              padding:'6px 4px', textAlign:'center',
              fontSize:'11px', fontWeight:600,
              textTransform:'uppercase', letterSpacing:'.5px',
              color:'var(--theme-elevation-500,#888)',
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'1px', background:'var(--theme-elevation-300,#2a2a2a)', border:'1px solid var(--theme-elevation-300,#2a2a2a)', borderRadius:'6px', overflow:'hidden' }}>
          {grid.map((dateStr, i) => {
            if (!dateStr) {
              return <div key={`e${i}`} style={{ background:'var(--theme-elevation-50,#0d0d0d)' }} className="cal-cell" />
            }

            const dayItems  = dateMap.get(dateStr) ?? []
            const hasEvents = dayItems.length > 0
            const isToday   = dateStr === TODAY
            const dayNum    = parseInt(dateStr.slice(8), 10)
            const visible   = dayItems.slice(0, 2)
            const overflow  = dayItems.length - 2

            return (
              <div
                key={dateStr}
                className="cal-cell"
                onClick={() => hasEvents && setSelectedDay(dateStr)}
                style={{
                  background: isToday
                    ? 'var(--theme-elevation-250,#202020)'
                    : 'var(--theme-elevation-100,#141414)',
                  padding: '6px',
                  cursor: hasEvents ? 'pointer' : 'default',
                  outline: isToday ? '2px inset var(--color-success-500,#4ade80)' : 'none',
                  transition: 'background .12s',
                }}
                onMouseEnter={e => { if (hasEvents) (e.currentTarget as HTMLElement).style.background = 'var(--theme-elevation-300,#2a2a2a)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isToday ? 'var(--theme-elevation-250,#202020)' : 'var(--theme-elevation-100,#141414)' }}
              >
                {/* Date number */}
                <div style={{
                  fontSize:'12px', fontWeight: isToday ? 700 : 400, marginBottom:'3px',
                  color: isToday ? 'var(--color-success-500,#4ade80)' : 'var(--theme-text)',
                }}>
                  {dayNum}
                </div>

                {/* Desktop: pills */}
                {visible.map(s => (
                  <div key={s.id} className="cal-pill" style={{
                    fontSize:'10px', lineHeight:1.3,
                    background:'var(--theme-elevation-400,#333)',
                    color:'var(--theme-text)',
                    borderRadius:'3px', padding:'2px 5px', marginBottom:'2px',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                  }}>
                    {s.courseTitle}
                  </div>
                ))}
                {overflow > 0 && (
                  <div className="cal-pill" style={{ fontSize:'10px', color:'var(--theme-elevation-500,#888)', paddingLeft:'2px' }}>
                    +{overflow} more
                  </div>
                )}

                {/* Mobile: dot badge */}
                {hasEvents && (
                  <div className="cal-dot" style={{
                    alignItems:'center', justifyContent:'center',
                    marginTop:'2px',
                    width:'18px', height:'18px', borderRadius:'50%',
                    background:'var(--theme-elevation-500,#555)',
                    fontSize:'10px', fontWeight:700, color:'var(--theme-text)',
                  }}>
                    {dayItems.length}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <p style={{ fontSize:'11px', color:'var(--theme-elevation-500,#666)', margin:'8px 0 0' }}>
          Click any day with sessions to view details.
        </p>
      </div>

      {/* ════════════════════════════════════════════
          FILTER + LIST
      ════════════════════════════════════════════ */}
      <div>

        {/* Filter dropdown */}
        <div style={{ marginBottom:'20px' }}>
          <label style={{
            display:'block', fontSize:'11px', fontWeight:600,
            textTransform:'uppercase', letterSpacing:'.5px',
            color:'var(--theme-elevation-500,#888)', marginBottom:'6px',
          }}>
            View Course Schedules
          </label>
          <select
            value={course}
            onChange={e => { setCourse(e.target.value); setPage(1) }}
            style={{
              background:'var(--theme-elevation-150,#1a1a1a)',
              border:'1px solid var(--theme-elevation-500,#444)',
              borderRadius:'4px', color:'var(--theme-text)',
              padding:'8px 12px', fontSize:'14px',
              minWidth:'300px', maxWidth:'100%', cursor:'pointer',
            }}
          >
            <option value="all">All Schedules ({schedules.length})</option>
            {courses.map(([title, count]) => (
              <option key={title} value={title}>{title} ({count})</option>
            ))}
          </select>
        </div>

        {/* Results bar + print */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px', flexWrap:'wrap', gap:'8px' }}>
          <span style={{ fontSize:'13px', color:'var(--theme-elevation-500,#888)' }}>
            {filtered.length} schedule{filtered.length !== 1 ? 's' : ''}
            {course !== 'all' && ` for ${course}`}
          </span>
          <button onClick={handlePrint} style={btnBase}>
            ⊞ Print All Results
          </button>
        </div>

        {/* Schedule table */}
        {filtered.length === 0 ? (
          <p style={{ fontSize:'14px', color:'var(--theme-elevation-500,#888)' }}>No schedules found.</p>
        ) : (
          <>
            <div style={{ overflowX:'auto', borderRadius:'6px', border:'1px solid var(--theme-elevation-300,#2a2a2a)' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'var(--theme-elevation-100,#141414)' }}>
                    {['Course','Session Label','Date(s)','Time(s) ET','Seats','Status'].map(h => (
                      <th key={h} style={thSt}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map(s => {
                    const dates = s.sessions.map(x => x.date ? fmtDateShort(x.date) : '').filter(Boolean)
                    const times = s.sessions.map(x => {
                      if (!x.startTime && !x.endTime) return null
                      return [x.startTime && fmtTime(x.startTime), x.endTime && fmtTime(x.endTime)].filter(Boolean).join(' – ')
                    }).filter(Boolean) as string[]

                    return (
                      <tr key={s.id} style={{ background:'var(--theme-elevation-50,#0d0d0d)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--theme-elevation-100,#141414)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--theme-elevation-50,#0d0d0d)'}
                      >
                        <td style={tdSt}>
                          <Link
                            href={`/admin/collections/course-schedules/${s.id}`}
                            style={{ color:'var(--theme-text)', fontWeight:500, textDecoration:'none' }}
                          >
                            {s.courseTitle}
                          </Link>
                        </td>
                        <td style={{ ...tdSt, color:'var(--theme-elevation-500,#aaa)' }}>
                          {s.displayLabel ?? '—'}
                        </td>
                        <td style={tdSt}>
                          {dates.length === 0
                            ? <span style={{ color:'var(--theme-elevation-500,#888)' }}>—</span>
                            : dates.map((d, i) => <div key={i}>{d}</div>)
                          }
                        </td>
                        <td style={tdSt}>
                          {times.length === 0
                            ? <span style={{ color:'var(--theme-elevation-500,#888)' }}>—</span>
                            : times.map((t, i) => <div key={i}>{t}</div>)
                          }
                        </td>
                        <td style={{ ...tdSt, whiteSpace:'nowrap' }}>
                          {s.seatsBooked} / {s.maxSeats}
                        </td>
                        <td style={tdSt}>
                          <span style={{
                            display:'inline-block', padding:'2px 8px', borderRadius:'3px',
                            fontSize:'11px', fontWeight:600,
                            background: s.isActive ? 'rgba(74,222,128,.12)' : 'rgba(255,255,255,.06)',
                            color:       s.isActive ? '#4ade80'             : 'var(--theme-elevation-500,#888)',
                          }}>
                            {s.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display:'flex', gap:'6px', alignItems:'center', marginTop:'20px', flexWrap:'wrap' }}>
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  style={{ ...btnBase, opacity: page === 1 ? .4 : 1 }}>
                  ‹ Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)} style={{
                    ...btnBase,
                    background: p === page ? 'var(--theme-elevation-500,#444)' : 'var(--theme-elevation-200,#222)',
                    fontWeight: p === page ? 700 : 400,
                  }}>
                    {p}
                  </button>
                ))}
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                  style={{ ...btnBase, opacity: page === totalPages ? .4 : 1 }}>
                  Next ›
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Day detail modal ── */}
      {selectedDay && (
        <DayModal
          dateStr={selectedDay}
          items={dateMap.get(selectedDay) ?? []}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </>
  )
}
