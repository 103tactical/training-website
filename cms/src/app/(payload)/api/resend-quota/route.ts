import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 200 })
  }

  try {
    const res = await fetch('https://api.resend.com/emails?limit=1', {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    })

    const daily   = res.headers.get('x-resend-daily-quota')
    const monthly = res.headers.get('x-resend-monthly-quota')

    return NextResponse.json({
      dailyUsed:   daily   !== null ? parseInt(daily,   10) : null,
      monthlyUsed: monthly !== null ? parseInt(monthly, 10) : null,
      error: null,
    })
  } catch (err) {
    return NextResponse.json({ dailyUsed: null, monthlyUsed: null, error: String(err) })
  }
}
