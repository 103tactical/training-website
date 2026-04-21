'use client'

import React, { useEffect, useState } from 'react'

interface ResendQuota {
  dailyUsed:   number | null
  monthlyUsed: number | null
  error:       string | null
}

const FREE_DAILY_LIMIT   = 100
const FREE_MONTHLY_LIMIT = 3_000

function pctColor(pct: number): string {
  return pct >= 90 ? '#b91c1c' : pct >= 70 ? '#d97706' : '#16a34a'
}

function QuotaBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const pct       = Math.min(100, Math.round((used / limit) * 100))
  const color     = pctColor(pct)
  const remaining = Math.max(0, limit - used)

  return (
    <div className="rq-bar-wrap">
      <div className="rq-bar-header">
        <span className="rq-bar-label">{label}</span>
        <span className="rq-bar-count">{used.toLocaleString()} / {limit.toLocaleString()}</span>
      </div>
      <div className="rq-track">
        <div className="rq-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="rq-remaining" style={{ color: pct >= 90 ? color : undefined }}>
        {pct >= 100
          ? '⚠ Limit reached — emails paused until quota resets'
          : `${remaining.toLocaleString()} remaining`}
      </span>
    </div>
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

  const isFreePlan = quota?.dailyUsed !== null
  const dailyPct   = isFreePlan && quota?.dailyUsed != null
    ? Math.round((quota.dailyUsed   / FREE_DAILY_LIMIT)   * 100) : 0
  const monthlyPct = quota?.monthlyUsed != null
    ? Math.round((quota.monthlyUsed / FREE_MONTHLY_LIMIT) * 100) : 0
  const worstPct   = Math.max(dailyPct, monthlyPct)
  const dotColor   = !quota || quota.error ? '#888'
    : worstPct >= 90 ? '#b91c1c'
    : worstPct >= 70 ? '#d97706'
    : '#16a34a'

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
          border-color: var(--theme-elevation-150);
        }
        .rq-card-alert {
          border-color: #b91c1c44 !important;
        }
        .rq-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .rq-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .rq-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
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
        .rq-link {
          font-size: 12px;
          color: #ea580c;
          text-decoration: none;
        }
        .rq-bars {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }
        .rq-bar-wrap {
          display: flex;
          flex-direction: column;
          gap: 5px;
          flex: 1;
          min-width: 180px;
        }
        .rq-bar-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }
        .rq-bar-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--theme-elevation-500);
        }
        .rq-bar-count {
          font-size: 12px;
          color: var(--theme-text);
        }
        .rq-track {
          height: 6px;
          background: var(--theme-elevation-200);
          border-radius: 3px;
          overflow: hidden;
        }
        .rq-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s;
        }
        .rq-remaining {
          font-size: 11px;
          color: var(--theme-elevation-500);
        }
        .rq-footer {
          margin: 10px 0 0;
          font-size: 11px;
          line-height: 1.5;
          color: var(--theme-elevation-500);
        }
        .rq-footer a {
          color: #ea580c;
          text-decoration: none;
        }
        .rq-loading {
          font-size: 13px;
          color: var(--theme-elevation-500);
        }
      `}</style>

      <div className={`rq-card${worstPct >= 90 ? ' rq-card-alert' : ''}`}>
        <div className="rq-header">
          <div className="rq-title-row">
            <div className="rq-dot" style={{ background: dotColor }} />
            <span className="rq-title">Email Service — Resend</span>
            {quota && !quota.error && isFreePlan && (
              <span className="rq-badge">Free Plan</span>
            )}
          </div>
          <a
            href="https://resend.com/settings/usage"
            target="_blank"
            rel="noopener noreferrer"
            className="rq-link"
          >
            View in Resend →
          </a>
        </div>

        {!quota ? (
          <span className="rq-loading">Loading…</span>
        ) : quota.error ? (
          <span className="rq-loading">Could not retrieve quota: {quota.error}</span>
        ) : (
          <>
            <div className="rq-bars">
              {isFreePlan && quota.dailyUsed !== null && (
                <QuotaBar used={quota.dailyUsed} limit={FREE_DAILY_LIMIT} label="Today" />
              )}
              {quota.monthlyUsed !== null && (
                <QuotaBar
                  used={quota.monthlyUsed}
                  limit={FREE_MONTHLY_LIMIT}
                  label={isFreePlan ? 'This Month' : 'Monthly (free plan limit)'}
                />
              )}
            </div>
            <p className="rq-footer">
              {isFreePlan
                ? 'Free plan: 100 emails/day · 3,000 emails/month. Daily resets at midnight UTC; monthly on your billing date.'
                : 'Paid plan: no daily limit. Monthly quota resets on your billing date.'}
              {' '}Upgrade at{' '}
              <a href="https://resend.com/settings/billing" target="_blank" rel="noopener noreferrer">
                resend.com/settings/billing
              </a>.
            </p>
          </>
        )}
      </div>
    </>
  )
}
