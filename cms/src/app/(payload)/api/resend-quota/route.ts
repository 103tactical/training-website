import { NextResponse } from 'next/server'
import { loadQuota, saveQuota } from '../../../../lib/resend-quota-cache'
import { timingSafeEqual } from 'crypto'

// Always compute per-request — never serve a statically cached response
export const dynamic = 'force-dynamic'

/**
 * Live usage counts straight from Resend's email list (Resend has no quota
 * READ endpoint — quota headers only arrive on sends — so we count the sent
 * emails themselves). Returns null on any failure so the cache fallback runs.
 * Note: one page covers 100 emails; at the free plan's 100/day cap the daily
 * count is always complete, and the monthly count is exact until volume
 * exceeds 100/month (then it reads as a floor — still enough to warn).
 */
async function liveCounts(): Promise<{ dailyUsed: number; monthlyUsed: number } | null> {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  try {
    const res = await fetch('https://api.resend.com/emails?limit=100', {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = await res.json()
    const rows: { created_at?: string }[] = Array.isArray(json?.data) ? json.data : []
    // created_at is UTC ("2026-07-30 09:08:40.358000+00") — prefix-compare
    // against UTC day/month, matching Resend's midnight-UTC daily reset.
    const today = new Date().toISOString().slice(0, 10)
    const month = today.slice(0, 7)
    let dailyUsed = 0
    let monthlyUsed = 0
    for (const r of rows) {
      const ts = String(r.created_at ?? '')
      if (ts.startsWith(month)) monthlyUsed++
      if (ts.startsWith(today)) dailyUsed++
    }
    return { dailyUsed, monthlyUsed }
  } catch {
    return null
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
  // Preferred: count live from Resend on every dashboard load
  const live = await liveCounts()
  if (live) {
    // Keep the cache fresh too, for the fallback path
    saveQuota(live.dailyUsed, live.monthlyUsed).catch(() => {})
    return NextResponse.json({
      dailyUsed:   live.dailyUsed,
      monthlyUsed: live.monthlyUsed,
      updatedAt:   new Date().toISOString(),
      error:       null,
    })
  }

  // Fallback: last cached snapshot (from send-response headers)
  const cache = await loadQuota()

  if (!cache) {
    return NextResponse.json({ dailyUsed: null, monthlyUsed: null, updatedAt: null, error: null })
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
