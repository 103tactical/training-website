import { NextResponse } from 'next/server'
import { loadQuota, saveQuota } from '../../../../lib/resend-quota-cache'
import { timingSafeEqual } from 'crypto'

// Always compute per-request — never serve a statically cached response
export const dynamic = 'force-dynamic'

/**
 * Live usage counts straight from Resend's email list (Resend has no quota
 * READ endpoint, so we count the sent emails themselves). Pages through the
 * list with the `after` cursor and stops as soon as a page reaches back past
 * the start of the current UTC month — every email that counts toward the
 * monthly quota has been seen by then. Returns null on any failure so the
 * cache fallback runs.
 * (Until 2026-08-13 this read a single 100-row page, so the monthly figure
 * silently floored at 100 the first month real volume exceeded it.)
 */
async function liveCounts(): Promise<{ dailyUsed: number; monthlyUsed: number } | null> {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  try {
    // created_at is UTC ("2026-07-30 09:08:40.358000+00") — prefix-compare
    // against UTC day/month, matching Resend's midnight-UTC daily reset.
    const today = new Date().toISOString().slice(0, 10)
    const month = today.slice(0, 7)
    let dailyUsed = 0
    let monthlyUsed = 0
    let after: string | null = null
    // 50 pages = 5,000 emails — comfortably past any plan month this account
    // will see; a runaway-loop backstop, not an expected ceiling.
    for (let page = 0; page < 50; page++) {
      const url = `https://api.resend.com/emails?limit=100${after ? `&after=${after}` : ''}`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${key}` },
        cache: 'no-store',
      })
      if (!res.ok) return null
      const json = await res.json()
      const rows: { id?: string; created_at?: string }[] = Array.isArray(json?.data) ? json.data : []
      if (rows.length === 0) break
      let sawOlderMonth = false
      for (const r of rows) {
        const ts = String(r.created_at ?? '')
        if (ts.startsWith(month)) monthlyUsed++
        else sawOlderMonth = true
        if (ts.startsWith(today)) dailyUsed++
      }
      // List is newest-first: once a row predates this month, later pages
      // are all older — the monthly count is complete.
      if (sawOlderMonth || json?.has_more !== true) break
      after = String(rows[rows.length - 1].id ?? '')
      if (!after) break
    }
    return { dailyUsed, monthlyUsed }
  } catch {
    return null
  }
}

/**
 * Plan display config. Resend's API exposes no plan/limit endpoint, so these
 * come from CMS-service env vars with free-plan defaults — after a Resend
 * upgrade, set RESEND_PLAN_NAME / RESEND_PLAN_DAILY_LIMIT /
 * RESEND_PLAN_MONTHLY_LIMIT to match the new plan (daily limit 0 = no daily
 * cap, which hides the daily bar; paid Resend plans have no daily cap).
 */
function planConfig(): { name: string; dailyLimit: number | null; monthlyLimit: number } {
  const name = process.env.RESEND_PLAN_NAME?.trim() || 'Free'
  const daily = Number(process.env.RESEND_PLAN_DAILY_LIMIT ?? 100)
  const monthly = Number(process.env.RESEND_PLAN_MONTHLY_LIMIT ?? 3000)
  return {
    name,
    dailyLimit: Number.isFinite(daily) && daily > 0 ? daily : null,
    monthlyLimit: Number.isFinite(monthly) && monthly > 0 ? monthly : 3000,
  }
}

function checkSecret(req: Request): boolean {
  const auth   = req.headers.get('authorization') ?? ''
  const token  = auth.replace(/^Bearer\s+/i, '').trim()
  const secret = process.env.CMS_WRITE_SECRET ?? ''
  if (!token || !secret) return false
  try {
    const a = Buffer.from(token)
    const b = Buffer.from(secret)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch { return false }
}

export async function GET() {
  const plan = planConfig()
  // Preferred: count live from Resend on every dashboard load
  const live = await liveCounts()
  if (live) {
    // Keep the cache fresh too, for the fallback path
    saveQuota(live.dailyUsed, live.monthlyUsed).catch(() => {})
    return NextResponse.json({
      dailyUsed:   live.dailyUsed,
      monthlyUsed: live.monthlyUsed,
      plan,
      updatedAt:   new Date().toISOString(),
      error:       null,
    })
  }

  // Fallback: last cached snapshot (from send-response headers)
  const cache = await loadQuota()

  if (!cache) {
    return NextResponse.json({ dailyUsed: null, monthlyUsed: null, plan, updatedAt: null, error: null })
  }

  const now       = new Date()
  const updatedAt = new Date(cache.updatedAt)

  // Daily resets at midnight UTC every day
  const sameDay = (
    updatedAt.getUTCFullYear() === now.getUTCFullYear() &&
    updatedAt.getUTCMonth()    === now.getUTCMonth()    &&
    updatedAt.getUTCDate()     === now.getUTCDate()
  )

  // Monthly resets at midnight UTC on the 1st of each month
  const sameMonth = (
    updatedAt.getUTCFullYear() === now.getUTCFullYear() &&
    updatedAt.getUTCMonth()    === now.getUTCMonth()
  )

  return NextResponse.json({
    dailyUsed:   sameDay   ? cache.dailyUsed   : 0,
    monthlyUsed: sameMonth ? cache.monthlyUsed : 0,
    plan,
    updatedAt:   cache.updatedAt,
    error:       null,
  })
}

export async function POST(req: Request) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { dailyUsed, monthlyUsed } = await req.json()
  await saveQuota(
    typeof dailyUsed   === 'number' ? dailyUsed   : null,
    typeof monthlyUsed === 'number' ? monthlyUsed : null,
  )
  return NextResponse.json({ ok: true })
}
