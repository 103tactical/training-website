import { NextResponse } from 'next/server'
import { loadQuota, saveQuota } from '../../../../lib/resend-quota-cache'
import { timingSafeEqual } from 'crypto'

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
