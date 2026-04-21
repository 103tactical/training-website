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

function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
}

function fmtDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York',
  })
}

function toDateKey(iso: string): string { return iso.slice(0, 10) }

function firstDate(s: ScheduleItem): string {
  return s.sessions.map(x => x.date ?? '').filter(Boolean).sort()[0] ?? ''
}

// ── Calendar helpers ──────────────────────────────────────────────────────────

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

function calendarGrid(year: number, month: number): (string | null)[] {
  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay()
  const days     = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const grid: (string | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= days; d++) {
    grid.push(`${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`)
  }
  while (grid.length % 7 !== 0) grid.push(null)
  return grid
}

function todayKey(): string {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`
}

// ── Print generator ───────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function generatePrintHTML(items: ScheduleItem[], filterLabel: string): string {
  const printDate = new Date().toLocaleDateString('en-US', {
    month:'long', day:'numeric', year:'numeric', timeZone:'America/New_York',
  })
  const rows = items.map(s => {
    const dates = s.sessions.map(x => x.date ? fmtDateShort(x.date) : '').filter(Boolean)
    const times = s.sessions.map(x => {
      if (!x.startTime && !x.endTime) return null
      return [x.startTime && fmtTime(x.startTime), x.endTime && fmtTime(x.endTime)].filter(Boolean).join(' – ')
    }).filter(Boolean) as string[]
    return `<tr>
      <td>${esc(s.courseTitle)}</td>
      <td>${esc(s.displayLabel ?? '—')}</td>
      <td>${dates.map(esc).join('<br>')}</td>
      <td>${times.map(esc).join('<br>')}</td>
      <td>${s.seatsBooked} / ${s.maxSeats}</td>
      <td>${s.isActive ? 'Active' : 'Inactive'}</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>Course Schedules — ${esc(filterLabel)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:20px}
  h1{font-size:16px;margin:0 0 4px}
  .meta{font-size:10px;color:#666;margin-bottom:16px}
  table{width:100%;border-collapse:collapse}
  thead th{background:#1a1a1a;color:#fff;padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px}
  tbody td{padding:5px 8px;border-bottom:1px solid #e0e0e0;vertical-align:top}
  tbody tr:nth-child(even) td{background:#f5f5f5}
  @page{margin:1.5cm}
</style></head><body>
<h1>103 Tactical Training — Course Schedules</h1>
<p class="meta">Filter: ${esc(filterLabel)} &nbsp;·&nbsp; Printed ${esc(printDate)} &nbsp;·&nbsp; ${items.length} schedule${items.length!==1?'s':''}</p>
<table>
  <thead><tr>
    <th>Course</th><th>Session Label</th><th>Date(s)</th>
    <th>Time(s) ET</th><th>Seats (Booked / Total)</th><th>Status</th>
  </tr></thead>
  <tbody>${rows||'<tr><td colspan="6" style="text-align:center;color:#999">No schedules found.</td></tr>'}</tbody>
</table></body></html>`
}

// ── Day modal ─────────────────────────────────────────────────────────────────

function DayModal({ dateStr, items, onClose }: {
  dateStr: string; items: ScheduleItem[]; onClose: () => void
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, zIndex:9999,
        background:'rgba(0,0,0,0.65)',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:'var(--theme-elevation-0)',
          borderRadius:'var(--style-radius-m,8px)',
          padding:'24px',
          width:'100%', maxWidth:'460px', maxHeight:'80vh', overflowY:'auto',
        }}
      >
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' }}>
          <h3 style={{ margin:0, fontSize:'15px', fontWeight:600, color:'var(--theme-text)' }}>
            {fmtDateLong(dateStr+'T00:00:00Z')}
          </h3>
          <button
            onClick={onClose}
            style={{
              background:'none', border:'none', cursor:'pointer',
              color:'var(--theme-text)', fontSize:'22px', lineHeight:1, padding:'0 0 0 12px',
            }}
          >×</button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          {items.map(s => {
            const todaySessions = s.sessions.filter(x => x.date?.slice(0,10) === dateStr)
            return (
              <div key={s.id} style={{
                background:'var(--theme-elevation-100)',
                borderRadius:'var(--style-radius-s,4px)',
                padding:'12px',
              }}>
                <Link
                  href={`/admin/collections/course-schedules/${s.id}`}
                  style={{ fontWeight:600, fontSize:'13px', color:'var(--theme-text)', textDecoration:'none' }}
                >
                  {s.courseTitle}
                </Link>
                {s.displayLabel && (
                  <div style={{ fontSize:'12px', color:'var(--theme-text)', opacity:.55, marginTop:'2px' }}>
                    {s.displayLabel}
                  </div>
                )}
                {todaySessions.map((x, i) => (
                  (x.startTime || x.endTime) ? (
                    <div key={i} style={{ fontSize:'12px', color:'var(--theme-text)', opacity:.65, marginTop:'4px' }}>
                      {[x.startTime&&fmtTime(x.startTime), x.endTime&&fmtTime(x.endTime)].filter(Boolean).join(' – ')} ET
                    </div>
                  ) : null
                ))}
                <div style={{ fontSize:'11px', color:'var(--theme-text)', opacity:.45, marginTop:'6px' }}>
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

// ── Main component ────────────────────────────────────────────────────────────

export default function ScheduleCalendarClient({ schedules }: { schedules: ScheduleItem[] }) {
  const now = new Date()
  const [year,        setYear]        = useState(now.getFullYear())
  const [month,       setMonth]       = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [course,      setCourse]      = useState<string>('all')
  const [page,        setPage]        = useState(1)

  const TODAY = useMemo(() => todayKey(), [])
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()

  const dateMap = useMemo(() => buildDateMap(schedules), [schedules])
  const grid    = useMemo(() => calendarGrid(year, month), [year, month])

  // Unique course titles for dropdown (no counts)
  const courses = useMemo(() => {
    const seen = new Set<string>()
    return schedules
      .map(s => s.courseTitle)
      .filter(t => { if (seen.has(t)) return false; seen.add(t); return true })
      .sort()
  }, [schedules])

  const filtered = useMemo(() => {
    const base = course === 'all' ? schedules : schedules.filter(s => s.courseTitle === course)
    return [...base].sort((a, b) => firstDate(a).localeCompare(firstDate(b)))
  }, [schedules, course])

  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE)
  const pageItems   = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)
  const filterLabel = course === 'all' ? 'All Schedules' : course

  const prevMonth = () => month === 0  ? (setYear(y=>y-1), setMonth(11)) : setMonth(m=>m-1)
  const nextMonth = () => month === 11 ? (setYear(y=>y+1), setMonth(0))  : setMonth(m=>m+1)
  const goToday   = () => { setYear(now.getFullYear()); setMonth(now.getMonth()) }

  const handlePrint = () => {
    const html = generatePrintHTML(filtered, filterLabel)
    const win  = window.open('', '_blank', 'width=960,height=700')
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 350) }
  }

  return (
    <>
      {/* ── Scoped styles ── */}
      <style>{`
        /* Nav buttons — borderless, matches Payload's ghost button style */
        .cal-btn {
          background: transparent;
          border: none;
          border-radius: var(--style-radius-s, 4px);
          color: var(--theme-text);
          padding: 5px 14px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          line-height: 1.5;
          transition: background .12s;
        }
        .cal-btn:hover    { background: var(--theme-elevation-100); }
        .cal-btn:disabled { opacity: .35; cursor: default; }
        .cal-btn-current  { background: var(--theme-elevation-200); font-weight: 600; }

        /* Calendar cell responsive */
        .cal-cell { min-height: 90px; padding: 6px; }
        .cal-pill { display: block; }
        .cal-dot  { display: none; }
        @media (max-width: 640px) {
          .cal-cell { min-height: 52px; padding: 4px !important; }
          .cal-pill { display: none !important; }
          .cal-dot  { display: flex !important; }
        }

        /* Course pill text — dark grey in light mode, soft white in dark mode */
        .cal-pill-text { color: #374151; }
        [data-theme="dark"] .cal-pill-text { color: rgba(255,255,255,0.78); }

        /* Schedule list — alternating rows, theme-aware */
        .sch-row:nth-child(odd)  { background: var(--theme-elevation-0); }
        .sch-row:nth-child(even) { background: var(--theme-elevation-100); }
        .sch-row:hover           { background: var(--theme-elevation-200) !important; transition: background .1s; }

        /* Table header text */
        .sch-th {
          padding: 8px 12px; text-align: left;
          font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: .5px; white-space: nowrap;
          color: #374151;
        }
        [data-theme="dark"] .sch-th { color: rgba(255,255,255,0.4); }

        /* Results count text */
        .sch-meta { font-size: 13px; color: #374151; }
        [data-theme="dark"] .sch-meta { color: rgba(255,255,255,0.45); }

        /* Filter label */
        .sch-filter-label {
          display: block; font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px;
          color: #374151;
        }
        [data-theme="dark"] .sch-filter-label { color: rgba(255,255,255,0.4); }
      `}</style>

      {/* ════════════════════════════
          CALENDAR
      ════════════════════════════ */}
      <div style={{ marginBottom:'48px' }}>

        {/* Month + nav */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px', flexWrap:'wrap', gap:'8px' }}>
          <h2 style={{ margin:0, fontSize:'18px', fontWeight:700, color:'var(--theme-text)' }}>
            {MONTHS[month]} {year}
          </h2>
          <div style={{ display:'flex', gap:'4px', alignItems:'center' }}>
            {/* Today: grey when on current month, orange when navigated away */}
            <button
              onClick={goToday}
              className={isCurrentMonth ? 'cal-btn' : 'roster-btn'}
              style={{ padding:'5px 14px', fontSize:'13px' }}
            >
              {isCurrentMonth ? 'Today' : 'View Today'}
            </button>
            <button onClick={prevMonth} className="cal-btn" style={{ padding:'5px 10px' }}>‹</button>
            <button onClick={nextMonth} className="cal-btn" style={{ padding:'5px 10px' }}>›</button>
          </div>
        </div>

        {/* Day-of-week header */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:'1px' }}>
          {DOW.map(d => (
            <div key={d} style={{
              padding:'6px 4px', textAlign:'center',
              fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px',
              color:'var(--theme-text)', opacity:.35,
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(7,1fr)',
          gap:'1px',
          background:'var(--theme-elevation-200)',
          border:'1px solid var(--theme-elevation-200)',
          borderRadius:'var(--style-radius-m,8px)',
          overflow:'hidden',
        }}>
          {grid.map((dateStr, i) => {
            if (!dateStr) {
              return (
                <div key={`e${i}`} className="cal-cell"
                  style={{ background:'var(--theme-elevation-0)' }} />
              )
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
                  background: isToday ? 'var(--theme-elevation-100)' : 'var(--theme-elevation-0)',
                  cursor: hasEvents ? 'pointer' : 'default',
                  transition: 'background .12s',
                }}
                onMouseEnter={e => { if (hasEvents) (e.currentTarget as HTMLElement).style.background = 'var(--theme-elevation-200)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isToday ? 'var(--theme-elevation-100)' : 'var(--theme-elevation-0)' }}
              >
                <div style={{
                  fontSize:'12px', fontWeight: isToday ? 700 : 400, marginBottom:'3px',
                  color: 'var(--theme-text)',
                }}>
                  {dayNum}
                </div>

                {/* Desktop: orange-bg pill, dark grey text */}
                {visible.map(s => (
                  <div key={s.id} className="cal-pill cal-pill-text" style={{
                    fontSize:'10px', lineHeight:1.3,
                    background:'rgba(249,115,22,0.12)',
                    borderRadius:'var(--style-radius-s,3px)',
                    padding:'2px 5px', marginBottom:'2px',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                  }}>
                    {s.courseTitle}
                  </div>
                ))}
                {overflow > 0 && (
                  <div className="cal-pill" style={{
                    fontSize: '10px', lineHeight: 1.3,
                    background: 'var(--theme-elevation-200)',
                    color: 'var(--theme-elevation-800)',
                    borderRadius: 'var(--style-radius-s,3px)',
                    padding: '2px 5px', marginBottom: '2px',
                    fontWeight: 500,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    +{overflow} more
                  </div>
                )}

                {/* Mobile: count badge */}
                {hasEvents && (
                  <div className="cal-dot" style={{
                    alignItems:'center', justifyContent:'center',
                    marginTop:'2px', width:'18px', height:'18px', borderRadius:'50%',
                    background:'rgba(249,115,22,0.15)',
                    fontSize:'10px', fontWeight:700, color:'#f97316',
                  }}>
                    {dayItems.length}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p style={{ fontSize:'11px', color:'var(--theme-text)', opacity:.3, margin:'8px 0 0' }}>
          Click any day with sessions to view details.
        </p>
      </div>

      {/* ════════════════════════════
          FILTER + LIST
      ════════════════════════════ */}
      <div>

        {/* Filter dropdown */}
        <div style={{ marginBottom:'20px' }}>
          <label className="sch-filter-label">View Course Schedules</label>
          <select
            value={course}
            onChange={e => { setCourse(e.target.value); setPage(1) }}
            style={{
              background:'var(--theme-elevation-100)',
              border:'none',
              borderRadius:'var(--style-radius-s,4px)',
              color:'var(--theme-text)',
              padding:'8px 12px', fontSize:'14px',
              minWidth:'280px', maxWidth:'100%', cursor:'pointer',
            }}
          >
            <option value="all">All Schedules</option>
            {courses.map(title => (
              <option key={title} value={title}>{title}</option>
            ))}
          </select>
        </div>

        {/* Results count + Print */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px', flexWrap:'wrap', gap:'8px' }}>
          <span className="sch-meta">
            {filtered.length} schedule{filtered.length!==1?'s':''}
            {course!=='all' && ` for ${course}`}
          </span>
          <button onClick={handlePrint} className="roster-btn">
            Print All Results
          </button>
        </div>

        {/* Schedule table */}
        {filtered.length === 0 ? (
          <p style={{ fontSize:'14px', color:'var(--theme-text)', opacity:.45 }}>No schedules found.</p>
        ) : (
          <>
            <div style={{ overflowX:'auto', borderRadius:'var(--style-radius-m,8px)', overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'var(--theme-elevation-100)' }}>
                    {['Course','Session Label','Date(s)','Time(s) ET','Seats','Status'].map(h => (
                      <th key={h} className="sch-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map(s => {
                    const dates = s.sessions.map(x => x.date ? fmtDateShort(x.date) : '').filter(Boolean)
                    const times = s.sessions.map(x => {
                      if (!x.startTime && !x.endTime) return null
                      return [x.startTime&&fmtTime(x.startTime), x.endTime&&fmtTime(x.endTime)].filter(Boolean).join(' – ')
                    }).filter(Boolean) as string[]

                    return (
                      <tr key={s.id} className="sch-row">
                        <td style={{ padding:'10px 12px', color:'var(--theme-text)', verticalAlign:'top', fontSize:'13px' }}>
                          <Link
                            href={`/admin/collections/course-schedules/${s.id}`}
                            style={{ color:'var(--theme-text)', fontWeight:500, textDecoration:'none' }}
                          >
                            {s.courseTitle}
                          </Link>
                        </td>
                        <td style={{ padding:'10px 12px', color:'var(--theme-text)', opacity:.6, verticalAlign:'top', fontSize:'13px' }}>
                          {s.displayLabel ?? '—'}
                        </td>
                        <td style={{ padding:'10px 12px', color:'var(--theme-text)', verticalAlign:'top', fontSize:'13px' }}>
                          {dates.length===0
                            ? <span style={{ opacity:.35 }}>—</span>
                            : dates.map((d,i) => <div key={i}>{d}</div>)
                          }
                        </td>
                        <td style={{ padding:'10px 12px', color:'var(--theme-text)', verticalAlign:'top', fontSize:'13px' }}>
                          {times.length===0
                            ? <span style={{ opacity:.35 }}>—</span>
                            : times.map((t,i) => <div key={i}>{t}</div>)
                          }
                        </td>
                        <td style={{ padding:'10px 12px', color:'var(--theme-text)', verticalAlign:'top', fontSize:'13px', whiteSpace:'nowrap' }}>
                          {s.seatsBooked} / {s.maxSeats}
                        </td>
                        <td style={{ padding:'10px 12px', verticalAlign:'top', fontSize:'13px' }}>
                          <span style={{
                            display:'inline-block', padding:'2px 8px',
                            borderRadius:'var(--style-radius-s,4px)',
                            fontSize:'11px', fontWeight:600,
                            background: s.isActive ? 'rgba(249,115,22,0.1)' : 'rgba(128,128,128,0.12)',
                            color:       s.isActive ? '#f97316'             : 'var(--theme-text)',
                            opacity:     s.isActive ? 1 : .5,
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
              <div style={{ display:'flex', gap:'4px', alignItems:'center', marginTop:'20px', flexWrap:'wrap' }}>
                <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="cal-btn">
                  ‹ Prev
                </button>
                {Array.from({ length: totalPages }, (_,i) => i+1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`cal-btn${p===page?' cal-btn-current':''}`}
                  >
                    {p}
                  </button>
                ))}
                <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} className="cal-btn">
                  Next ›
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Day detail modal */}
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
