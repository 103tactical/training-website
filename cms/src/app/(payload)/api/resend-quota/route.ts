import { NextResponse } from 'next/server'
import { loadQuota } from '../../../../lib/resend-quota-cache'

export async function GET() {
  const cache = await loadQuota()
  return NextResponse.json({
    dailyUsed:   cache?.dailyUsed   ?? null,
    monthlyUsed: cache?.monthlyUsed ?? null,
    updatedAt:   cache?.updatedAt   ?? null,
    error:       null,
  })
}
