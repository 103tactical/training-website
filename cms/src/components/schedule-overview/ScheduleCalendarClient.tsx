'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import type { ScheduleItem, CourseOption, InstructorOption } from './ScheduleOverviewPage'

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

// ── Seat-hold badge ───────────────────────────────────────────────────────────
// Orange "+N links" pill shown next to seat counts when a session has
// outstanding admin-sent payment links (seats promised but not yet paid).
// nowrap internally; parent containers flex-wrap so it drops to its own line
// on narrow screens instead of overflowing.
function HoldBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span
      title={`${count} outstanding payment link${count === 1 ? '' : 's'} holding seats on the website`}
      style={{
        display: 'inline-block', padding: '1px 7px', borderRadius: '999px',
        fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap',
        background: 'rgba(234, 88, 12, 0.12)', color: '#ea580c',
        border: '1px solid rgba(234, 88, 12, 0.35)', verticalAlign: 'middle',
      }}
    >
      +{count} pending
    </span>
  )
}

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
      <td>${s.seatsBooked} / ${s.maxSeats}${s.seatsHeld > 0 ? ` (+${s.seatsHeld} pending link${s.seatsHeld === 1 ? '' : 's'})` : ''}</td>
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

// ── Add-session form (inside the day modal) ───────────────────────────────────

type SessionRow = { date: string; start: string; end: string }

function pad2(n: number): string { return String(n).padStart(2, '0') }

/** ISO datetime → "HH:MM" in the admin's local time (matches how the admin's
 *  own time pickers interpret times). */
function isoToLocalHHMM(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** "YYYY-MM-DD" + "HH:MM" in local time → ISO datetime (same convention the
 *  admin's time pickers store). */
function localToISO(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString()
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Suggest an internal label from the chosen dates, matching the house style:
 *  "Dec 1" · "Dec 1/2" · "Dec 30 / Jan 2" */
function suggestLabel(rows: SessionRow[]): string {
  const dates = rows.map((r) => r.date).filter(Boolean).sort()
  if (dates.length === 0) return ''
  const parts = dates.map((d) => {
    const dt = new Date(`${d}T12:00:00Z`)
    return {
      mon: dt.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
      day: dt.getUTCDate(),
    }
  })
  const sameMonth = parts.every((p) => p.mon === parts[0].mon)
  if (sameMonth) return `${parts[0].mon} ${parts.map((p) => p.day).join('/')}`
  return parts.map((p) => `${p.mon} ${p.day}`).join(' / ')
}

const inputStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-100)',
  border: 'none',
  borderRadius: 'var(--style-radius-s,4px)',
  color: 'var(--theme-text)',
  padding: '7px 10px',
  fontSize: '13px',
  width: '100%',
  boxSizing: 'border-box',
}

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '.5px',
  color: 'var(--theme-text)',
  opacity: 0.55,
  marginBottom: '4px',
}

function AddSessionForm({ dateStr, courses, instructors, onCreated, onCancel }: {
  dateStr: string
  courses: CourseOption[]
  instructors: InstructorOption[]
  onCreated: () => void
  onCancel: () => void
}) {
  const [courseId, setCourseId]         = useState<string>('')
  const [rows, setRows]                 = useState<SessionRow[]>([])
  const [displayLabel, setDisplayLabel] = useState('')
  const [instructorId, setInstructorId] = useState<string>('')
  const [maxSeats, setMaxSeats]         = useState<string>('20')
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [justCreated, setJustCreated]   = useState<string | null>(null)

  const selectedCourse = courses.find((c) => String(c.id) === courseId) ?? null

  // Choosing a course seeds one row per course day (consecutive, starting on
  // the clicked date) with the times/seats from that course's last schedule.
  const chooseCourse = (id: string) => {
    setCourseId(id)
    setError(null)
    const c = courses.find((x) => String(x.id) === id)
    if (!c) { setRows([]); return }
    const start = isoToLocalHHMM(c.defaultStartTime) ?? '10:00'
    const end   = isoToLocalHHMM(c.defaultEndTime)   ?? '18:00'
    const seeded: SessionRow[] = Array.from({ length: c.durationDays }, (_, i) => ({
      date: addDays(dateStr, i), start, end,
    }))
    setRows(seeded)
    setMaxSeats(String(c.defaultMaxSeats ?? 20))
  }

  const updateRow = (i: number, patch: Partial<SessionRow>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  const addRow = () => {
    setRows((prev) => {
      const last = prev[prev.length - 1]
      return [...prev, {
        date: last ? addDays(last.date, 1) : dateStr,
        start: last?.start ?? '10:00',
        end: last?.end ?? '18:00',
      }]
    })
  }
  const removeRow = (i: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i))
  }

  const save = async () => {
    setError(null)
    if (!selectedCourse) { setError('Choose a course first.'); return }
    if (rows.length === 0) { setError('Add at least one day.'); return }
    for (const r of rows) {
      if (!r.date || !r.start || !r.end) { setError('Every day needs a date, start time, and end time.'); return }
    }
    const seats = parseInt(maxSeats, 10)
    if (isNaN(seats) || seats < 1) { setError('Total Seats must be at least 1.'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/course-schedules', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course: selectedCourse.id,
          // Internal label is auto-generated from the dates by the collection
          maxSeats: seats,
          isActive: true,
          ...(displayLabel.trim() ? { displayLabel: displayLabel.trim() } : {}),
          ...(instructorId ? { instructor: Number(instructorId) } : {}),
          sessions: rows.map((r) => ({
            date: `${r.date}T00:00:00.000Z`,
            startTime: localToISO(r.date, r.start),
            endTime: localToISO(r.date, r.end),
          })),
        }),
      })
      if (!res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const j: any = await res.json().catch(() => ({}))
        const msg = j?.errors?.[0]?.message ?? `Save failed (${res.status}). Please try again.`
        setError(msg)
        return
      }
      onCreated()
      setJustCreated(`${selectedCourse.title} — ${suggestLabel(rows)}`)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Success state: confirm + offer to add another (form values are kept so a
  // second session for the same course only needs new dates)
  if (justCreated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{
          background: 'rgba(34,197,94,0.1)', color: 'var(--theme-text)',
          borderRadius: 'var(--style-radius-s,4px)', padding: '12px 14px', fontSize: '13px',
        }}>
          ✓ Session created: <strong>{justCreated}</strong>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="roster-btn"
            onClick={() => { setJustCreated(null); setError(null) }}
          >
            Add Another Session
          </button>
          <button type="button" className="cal-btn" onClick={onCancel}>
            Done
          </button>
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--theme-text)', opacity: 0.5 }}>
          The calendar refreshes when you close this window.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <label style={fieldLabelStyle}>Course</label>
        <select value={courseId} onChange={(e) => chooseCourse(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="">Choose a course…</option>
          {courses.map((c) => (
            <option key={c.id} value={String(c.id)}>{c.title}</option>
          ))}
        </select>
        {selectedCourse && selectedCourse.durationDays > 1 && (
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--theme-text)', opacity: 0.55 }}>
            This course runs {selectedCourse.durationDays} days — one row per day below, starting on the day you clicked. Adjust any of them.
          </p>
        )}
      </div>

      {rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ ...fieldLabelStyle, marginBottom: 0 }}>Class Days &amp; Times (ET)</label>
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="date" value={r.date} onChange={(e) => updateRow(i, { date: e.target.value })} style={{ ...inputStyle, width: 'auto', flex: '1 1 130px' }} />
              <input type="time" value={r.start} onChange={(e) => updateRow(i, { start: e.target.value })} style={{ ...inputStyle, width: 'auto', flex: '1 1 90px' }} />
              <span style={{ color: 'var(--theme-text)', opacity: 0.4, fontSize: '12px' }}>to</span>
              <input type="time" value={r.end} onChange={(e) => updateRow(i, { end: e.target.value })} style={{ ...inputStyle, width: 'auto', flex: '1 1 90px' }} />
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  title="Remove this day"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--theme-text)', opacity: 0.5, fontSize: '16px', padding: '2px 6px' }}
                >×</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addRow} className="cal-btn" style={{ alignSelf: 'flex-start', fontSize: '12px' }}>
            + Add another day
          </button>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ flex: '2 1 180px' }}>
              <label style={fieldLabelStyle}>Instructor</label>
              <select value={instructorId} onChange={(e) => setInstructorId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">None yet</option>
                {instructors.map((i) => (
                  <option key={i.id} value={String(i.id)}>{i.name}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1 1 90px' }}>
              <label style={fieldLabelStyle}>Total Seats</label>
              <input type="number" min={1} value={maxSeats} onChange={(e) => setMaxSeats(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={fieldLabelStyle}>Display Label (optional)</label>
            <input
              type="text"
              value={displayLabel}
              onChange={(e) => setDisplayLabel(e.target.value)}
              placeholder="Visitor-facing session name, e.g. Afternoon Session"
              style={inputStyle}
            />
          </div>
        </>
      )}

      {error && (
        <div style={{
          background: 'rgba(220,38,38,0.1)', color: '#dc2626',
          borderRadius: 'var(--style-radius-s,4px)', padding: '10px 12px', fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button type="button" className="roster-btn" onClick={save} disabled={saving || !selectedCourse}>
          {saving ? 'Saving…' : 'Save Session'}
        </button>
        <button type="button" className="cal-btn" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
      <p style={{ margin: 0, fontSize: '12px', color: 'var(--theme-text)', opacity: 0.5 }}>
        The session is created Active (visible on the website). Its internal label is set automatically from the dates.
      </p>
    </div>
  )
}

// ── Day modal ─────────────────────────────────────────────────────────────────

function DayModal({ dateStr, items, courses, instructors, onClose }: {
  dateStr: string; items: ScheduleItem[]; courses: CourseOption[]; instructors: InstructorOption[]; onClose: () => void
}) {
  const [adding, setAdding]     = useState(items.length === 0)
  const [createdAny, setCreatedAny] = useState(false)

  // If a session was created, refresh so the calendar (server-fetched) shows it
  const close = () => {
    if (createdAny) { window.location.reload(); return }
    onClose()
  }

  return (
    <div
      onClick={close}
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
            onClick={close}
            style={{
              background:'none', border:'none', cursor:'pointer',
              color:'var(--theme-text)', fontSize:'22px', lineHeight:1, padding:'0 0 0 12px',
            }}
          >×</button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          {items.length === 0 && !adding && (
            <p style={{ margin:0, fontSize:'13px', color:'var(--theme-text)', opacity:.55 }}>
              No sessions on this day.
            </p>
          )}
          {items.map(s => {
            const todaySessions = s.sessions.filter(x => x.date?.slice(0,10) === dateStr)
            const seatsLeft = s.maxSeats - s.seatsBooked
            return (
              <div key={s.id} style={{
                background:'var(--theme-elevation-50)',
                border:'1px solid var(--theme-elevation-150)',
                borderLeft:'3px solid #f97316',
                borderRadius:'var(--style-radius-s,4px)',
                padding:'14px 16px',
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:'8px', flexWrap:'wrap' }}>
                  <span style={{ fontWeight:700, fontSize:'14px', color:'var(--theme-text)' }}>
                    {s.courseTitle}
                  </span>
                  {todaySessions.map((x, i) => (
                    (x.startTime || x.endTime) ? (
                      <span key={i} style={{ fontSize:'12px', fontWeight:600, color:'var(--theme-text)', opacity:.75, whiteSpace:'nowrap' }}>
                        {[x.startTime&&fmtTime(x.startTime), x.endTime&&fmtTime(x.endTime)].filter(Boolean).join(' – ')} ET
                      </span>
                    ) : null
                  ))}
                </div>

                {s.displayLabel && (
                  <div style={{ fontSize:'12px', color:'var(--theme-text)', opacity:.6, marginTop:'2px' }}>
                    {s.displayLabel}
                  </div>
                )}

                <div style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  marginTop:'12px', gap:'8px', flexWrap:'wrap',
                }}>
                  <span style={{ fontSize:'12px', color:'var(--theme-text)', opacity:.6, display:'inline-flex', alignItems:'center', gap:'6px', flexWrap:'wrap' }}>
                    <span style={{ whiteSpace:'nowrap' }}>{s.seatsBooked} / {s.maxSeats} booked</span>
                    <HoldBadge count={s.seatsHeld} />
                    {seatsLeft <= 0 && <span style={{ fontWeight:600, opacity:1 }}>· Full</span>}
                    {!s.isActive && <span style={{ color:'#f97316', fontWeight:600 }}>· Inactive</span>}
                  </span>
                  <Link
                    href={`/admin/collections/course-schedules/${s.id}`}
                    className="roster-btn"
                    style={{ textDecoration:'none', fontSize:'12px', padding:'6px 14px' }}
                  >
                    View Session
                  </Link>
                </div>
              </div>
            )
          })}

          {/* Add-a-session: button first, form when opened */}
          {adding ? (
            <div style={{
              background:'var(--theme-elevation-50)',
              borderRadius:'var(--style-radius-s,4px)',
              padding:'16px',
              marginTop: items.length > 0 ? '4px' : 0,
            }}>
              <h4 style={{ margin:'0 0 12px', fontSize:'13px', fontWeight:700, color:'var(--theme-text)' }}>
                Add a Session — starting {fmtDateLong(dateStr+'T00:00:00Z')}
              </h4>
              <AddSessionForm
                dateStr={dateStr}
                courses={courses}
                instructors={instructors}
                onCreated={() => setCreatedAny(true)}
                onCancel={close}
              />
            </div>
          ) : (
            <button
              type="button"
              className="roster-btn"
              onClick={() => setAdding(true)}
              style={{ alignSelf:'flex-start', marginTop: items.length > 0 ? '4px' : 0 }}
            >
              + Add a Session on This Day
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ScheduleCalendarClient({ schedules, courses: courseOptions = [], instructors: instructorOptions = [] }: { schedules: ScheduleItem[]; courses?: CourseOption[]; instructors?: InstructorOption[] }) {
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
        .cal-pill-text { color: #404040; }
        [data-theme="dark"] .cal-pill-text { color: rgba(255,255,255,0.78); }

        /* Schedule list — alternating rows matching Payload's collection
           lists EXACTLY: odd rows tinted one elevation step (elevation-50),
           even rows on the table surface. Same recipe, same phase, both
           themes — striping is identical on every list in the admin. */
        .sch-row:nth-child(odd)  { background: var(--theme-elevation-50); }
        .sch-row:nth-child(even) { background: var(--theme-elevation-0); }

        /* Course title link — underlined to signal it's clickable */
        .sch-title-link { text-decoration: underline !important; }

        /* Table header text */
        .sch-th {
          padding: 8px 12px; text-align: left;
          font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: .5px; white-space: nowrap;
          color: #404040;
        }
        [data-theme="dark"] .sch-th { color: rgba(255,255,255,0.4); }

        /* Results count text */
        .sch-meta { font-size: 13px; color: #404040; }
        [data-theme="dark"] .sch-meta { color: rgba(255,255,255,0.45); }

        /* Filter label */
        .sch-filter-label {
          display: block; font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px;
          color: #404040;
        }
        [data-theme="dark"] .sch-filter-label { color: rgba(255,255,255,0.4); }

        /* Day-of-week header band — solid with knockout text, inverted per
           theme; mid-tone grays so it's neither harsh black nor stark white */
        .cal-dow-row {
          border-radius: var(--style-radius-s, 4px);
          overflow: hidden;
          margin-bottom: 6px;
        }
        .cal-dow {
          padding: 7px 4px; text-align: center;
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: .5px;
          background: #4d4d4d; color: #ffffff;
        }
        [data-theme="dark"] .cal-dow {
          background: #d4d4d4; color: #262626;
        }
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
            <button onClick={prevMonth} className="cal-btn" style={{ padding:'2px 10px', fontSize:'22px', lineHeight:1 }}>‹</button>
            <button onClick={nextMonth} className="cal-btn" style={{ padding:'2px 10px', fontSize:'22px', lineHeight:1 }}>›</button>
          </div>
        </div>

        {/* Day-of-week header — solid band with knockout text (inverted per theme) */}
        <div className="cal-dow-row" style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
          {DOW.map(d => (
            <div key={d} className="cal-dow">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid — solid surface on the recessed page (internal 1px
            cell separation stays; a calendar needs its grid) */}
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(7,1fr)',
          gap:'1px',
          background:'var(--theme-elevation-200)',
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
                onClick={() => setSelectedDay(dateStr)}
                style={{
                  background: isToday ? 'var(--theme-elevation-100)' : 'var(--theme-elevation-0)',
                  cursor: 'pointer',
                  transition: 'background .12s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--theme-elevation-200)' }}
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
                    background: 'var(--theme-elevation-100)',
                    color: 'var(--theme-elevation-400)',
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
          Click any day to view its sessions or add a new one.
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
              padding:'8px 36px 8px 12px', fontSize:'14px',
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
            <div style={{ overflowX:'auto', borderRadius:'var(--style-radius-m,8px)', overflow:'hidden', background:'var(--theme-elevation-0)' }}>
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
                            className="sch-title-link"
                            style={{ color:'var(--theme-text)', fontWeight:500 }}
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
                        <td style={{ padding:'10px 12px', color:'var(--theme-text)', verticalAlign:'top', fontSize:'13px' }}>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:'6px', flexWrap:'wrap' }}>
                            <span style={{ whiteSpace:'nowrap' }}>{s.seatsBooked} / {s.maxSeats}</span>
                            <HoldBadge count={s.seatsHeld} />
                          </span>
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
          courses={courseOptions}
          instructors={instructorOptions}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </>
  )
}
