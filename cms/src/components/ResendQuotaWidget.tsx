'use client'

import React, { useEffect, useState } from 'react'

interface ResendQuota {
  dailyUsed:   number | null
  monthlyUsed: number | null
  error:       string | null
}

const FREE_DAILY_LIMIT   = 100
const FREE_MONTHLY_LIMIT = 3_000

function pct(used: number, limit: number) {
  return Math.min(100, Math.round((used / limit) * 100))
}

function barColor(p: number) {
  return p >= 100 ? '#b91c1c' : p >= 80 ? '#d97706' : '#16a34a'
}

function statusMessage(quota: ResendQuota): React.ReactNode {
  const isFreePlan  = quota.dailyUsed !== null
  const dailyP      = isFreePlan && quota.dailyUsed  != null ? pct(quota.dailyUsed,  FREE_DAILY_LIMIT)   : 0
  const monthlyP    = quota.monthlyUsed != null               ? pct(quota.monthlyUsed, FREE_MONTHLY_LIMIT) : 0

  const dailyRemain   = Math.max(0, FREE_DAILY_LIMIT   - (quota.dailyUsed   ?? 0))
  const monthlyRemain = Math.max(0, FREE_MONTHLY_LIMIT - (quota.monthlyUsed ?? 0))

  if (dailyP >= 100 || monthlyP >= 100) {
    const which = dailyP >= 100 && monthlyP >= 100
      ? 'daily and monthly limits have'
      : dailyP >= 100 ? 'daily limit has' : 'monthly limit has'
    const reset = dailyP >= 100
      ? 'The daily quota resets at midnight UTC.'
      : 'The monthly quota resets on your Resend billing date.'
    return (
      <>
        <strong>Limit reached — all outbound emails are currently paused.</strong> The {which} been
        reached. {reset} To restore email delivery immediately,{' '}
        <a href="https://resend.com/settings/billing" target="_blank" rel="noopener noreferrer" className="rq-inline-link">
          upgrade your Resend plan
        </a>.
      </>
    )
  }

  if (dailyP >= 80 || monthlyP >= 80) {
    const which = dailyP >= 80 && monthlyP >= 80
      ? `${dailyRemain} email${dailyRemain !== 1 ? 's' : ''} remaining today and ${monthlyRemain.toLocaleString()} this month`
      : dailyP >= 80
        ? `${dailyRemain} email${dailyRemain !== 1 ? 's' : ''} remaining today`
        : `${monthlyRemain.toLocaleString()} email${monthlyRemain !== 1 ? 's' : ''} remaining this month`
    return (
      <>
        <strong>Approaching limit</strong> — only {which}. If usage continues at this pace,
        email delivery will pause before the quota resets. Recommend{' '}
        <a href="https://resend.com/settings/billing" target="_blank" rel="noopener noreferrer" className="rq-inline-link">
          upgrading your Resend plan
        </a>{' '}
        before the limit is reached.
      </>
    )
  }

  return isFreePlan ? (
    <>
      <strong>Email delivery is operating normally.</strong> {dailyRemain} email{dailyRemain !== 1 ? 's' : ''} remaining
      today and {monthlyRemain.toLocaleString()} remaining this month. At current usage the free plan
      is sufficient — no action needed.
    </>
  ) : (
    <>
      <strong>Email delivery is operating normally.</strong> {monthlyRemain.toLocaleString()} email{monthlyRemain !== 1 ? 's' : ''} remaining
      this month. No action needed.
    </>
  )
}

export default function ResendQuotaWidget() {
  const [quota, setQuota] = useState<ResendQuota | null>(null)

  useEffect(() => {
    fetch('/api/resend-quota')
      .then(r => r.json())
      .then(setQuota)
      .catch(() => setQuota({ dailyUsed: null, monthlyUsed: null, error: 'Request failed' }))
  }, [])

  const isFreePlan  = quota !== null && quota.dailyUsed !== null
  const dailyP      = isFreePlan && quota?.dailyUsed  != null ? pct(quota.dailyUsed,  FREE_DAILY_LIMIT)   : 0
  const monthlyP    = quota?.monthlyUsed != null               ? pct(quota.monthlyUsed, FREE_MONTHLY_LIMIT) : 0
  const worstPct    = Math.max(dailyP, monthlyP)
  const color       = quota && !quota.error ? barColor(worstPct) : '#888'
  const msgColor    = worstPct >= 80 ? color : 'var(--theme-elevation-500)'

  return (
    <>
      <style>{`
        .rq-card {
          border-radius: 8px;
          padding: 16px 20px;
          margin-bottom: 28px;
          border: 1px solid var(--theme-elevation-200);
          background: var(--theme-elevation-50);
        }
        [data-theme="dark"] .rq-card {
          background: var(--theme-elevation-100);
        }
        .rq-bar-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .rq-track {
          flex: 1;
          height: 10px;
          background: var(--theme-elevation-200);
          border-radius: 5px;
          overflow: hidden;
        }
        .rq-fill {
          height: 100%;
          border-radius: 5px;
          transition: width 0.4s;
          min-width: 2px;
        }
        .rq-pct {
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .rq-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .rq-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .rq-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--theme-text);
        }
        .rq-badge {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          background: var(--theme-elevation-200);
          color: var(--theme-elevation-500);
        }
        .rq-ext-link {
          font-size: 12px;
          color: #ea580c;
          text-decoration: none;
          flex-shrink: 0;
        }
        .rq-numbers {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-bottom: 10px;
        }
        .rq-num-line {
          font-size: 13px;
          font-weight: 600;
          color: var(--theme-text);
        }
        .rq-num-label {
          color: var(--theme-elevation-500);
          font-weight: 400;
        }
        .rq-status {
          font-size: 12px;
          line-height: 1.55;
          padding-top: 8px;
          border-top: 1px solid var(--theme-elevation-200);
        }
        .rq-inline-link {
          color: #ea580c;
          text-decoration: underline;
        }
        .rq-loading {
          font-size: 13px;
          color: var(--theme-elevation-500);
        }
      `}</style>

      <div className="rq-card">
        {!quota ? (
          <span className="rq-loading">Loading…</span>
        ) : quota.error ? (
          <span className="rq-loading">Could not retrieve quota: {quota.error}</span>
        ) : (
          <>
            {/* ── Title row ── */}
            <div className="rq-title-row">
              <div className="rq-left">
                <span className="rq-title">Email Delivery Status</span>
                {isFreePlan && <span className="rq-badge">Free Plan</span>}
              </div>
              <a
                href="https://resend.com/settings/usage"
                target="_blank"
                rel="noopener noreferrer"
                className="rq-ext-link"
              >
                Resend Dashboard →
              </a>
            </div>

            {/* ── Progress bar row ── */}
            <div className="rq-bar-row">
              <div className="rq-track">
                <div
                  className="rq-fill"
                  style={{ width: `${worstPct}%`, background: color }}
                />
              </div>
              <span className="rq-pct" style={{ color }}>
                Usage: {worstPct}%
              </span>
            </div>

            {/* ── Numbers ── */}
            <div className="rq-numbers">
              <span className="rq-num-line">
                <span className="rq-num-label">Daily: </span>
                {(quota.dailyUsed ?? 0)} of {FREE_DAILY_LIMIT}
              </span>
              <span className="rq-num-line">
                <span className="rq-num-label">Monthly: </span>
                {(quota.monthlyUsed ?? 0).toLocaleString()} of {FREE_MONTHLY_LIMIT.toLocaleString()}
              </span>
            </div>

            {/* ── Status message ── */}
            <div className="rq-status" style={{ color: msgColor }}>
              {statusMessage(quota)}
            </div>
          </>
        )}
      </div>
    </>
  )
}
