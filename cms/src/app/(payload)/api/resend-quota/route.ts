import { NextResponse } from 'next/server'
import { loadQuota } from '../../../../lib/resend-quota-cache'

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
