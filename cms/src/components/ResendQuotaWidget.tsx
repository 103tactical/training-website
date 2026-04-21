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

// ── Individual quota row ──────────────────────────────────────────────────────

function QuotaRow({ used, limit, label }: { used: number; limit: number; label: string }) {
  const p     = pct(used, limit)
  const color = barColor(p)
  return (
    <div className="rq-row">
      <div className="rq-row-header">
        <span className="rq-row-label">{label}</span>
        <span className="rq-row-count" style={{ color }}>
          {used.toLocaleString()} of {limit.toLocaleString()}
        </span>
      </div>
      <div className="rq-track">
        <div className="rq-fill" style={{ width: `${p}%`, background: color }} />
      </div>
    </div>
  )
}

// ── Status message ────────────────────────────────────────────────────────────

function statusMessage(quota: ResendQuota): { color: string; dot: string; message: React.ReactNode } {
  const isFreePlan  = quota.dailyUsed !== null
  const dailyP      = isFreePlan && quota.dailyUsed  != null ? pct(quota.dailyUsed,  FREE_DAILY_LIMIT)   : 0
  const monthlyP    = quota.monthlyUsed != null               ? pct(quota.monthlyUsed, FREE_MONTHLY_LIMIT) : 0

  const dailyRemain   = Math.max(0, FREE_DAILY_LIMIT   - (quota.dailyUsed   ?? 0))
  const monthlyRemain = Math.max(0, FREE_MONTHLY_LIMIT - (quota.monthlyUsed ?? 0))

  // Red — any limit hit
  if (dailyP >= 100 || monthlyP >= 100) {
    const which = dailyP >= 100 && monthlyP >= 100
      ? 'daily and monthly limits have'
      : dailyP >= 100 ? 'daily limit has' : 'monthly limit has'
    const reset = dailyP >= 100
      ? 'The daily quota resets at midnight UTC.'
      : 'The monthly quota resets on your Resend billing date.'
    return {
      dot: '#b91c1c',
      color: '#b91c1c',
      message: (
        <>
          <strong>Limit reached — all outbound emails are currently paused.</strong> The {which} been
          reached. {reset} To restore email delivery immediately,{' '}
          <a href="https://resend.com/settings/billing" target="_blank" rel="noopener noreferrer" className="rq-inline-link">
            upgrade your Resend plan
          </a>.
        </>
      ),
    }
  }

  // Orange — 80 % or above on any quota
  if (dailyP >= 80 || monthlyP >= 80) {
    const which = dailyP >= 80 && monthlyP >= 80
      ? `${dailyRemain} email${dailyRemain !== 1 ? 's' : ''} remaining today and ${monthlyRemain.toLocaleString()} this month`
      : dailyP >= 80
        ? `${dailyRemain} email${dailyRemain !== 1 ? 's' : ''} remaining today`
        : `${monthlyRemain.toLocaleString()} email${monthlyRemain !== 1 ? 's' : ''} remaining this month`
    return {
      dot: '#d97706',
      color: '#d97706',
      message: (
        <>
          <strong>Approaching limit</strong> — only {which}. If usage continues at this pace,
          email delivery will pause before the quota resets. Recommend{' '}
          <a href="https://resend.com/settings/billing" target="_blank" rel="noopener noreferrer" className="rq-inline-link">
            upgrading your Resend plan
          </a>{' '}
          before the limit is reached.
        </>
      ),
    }
  }

  // Green — normal
  return {
    dot: '#16a34a',
    color: '#16a34a',
    message: isFreePlan ? (
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
    ),
  }
}

// ── Widget ────────────────────────────────────────────────────────────────────

export default function ResendQuotaWidget() {
  const [quota, setQuota] = useState<ResendQuota | null>(null)

  useEffect(() => {
    fetch('/api/resend-quota')
      .then(r => r.json())
      .then(setQuota)
      .catch(() => setQuota({ dailyUsed: null, monthlyUsed: null, error: 'Request failed' }))
  }, [])

  const isFreePlan = quota !== null && quota.dailyUsed !== null
  const status     = quota && !quota.error ? statusMessage(quota) : null

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
        .rq-ext-link {
          font-size: 12px;
          color: #ea580c;
          text-decoration: none;
        }
        .rq-inline-link {
          color: #ea580c;
          text-decoration: underline;
        }
        .rq-rows {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        .rq-row {
          display: flex;
          flex-direction: column;
          gap: 5px;
          flex: 1;
          min-width: 180px;
        }
        .rq-row-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 8px;
        }
        .rq-row-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--theme-elevation-500);
          white-space: nowrap;
        }
        .rq-row-count {
          font-size: 13px;
          font-weight: 600;
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
          transition: width 0.4s;
        }
        .rq-status {
          font-size: 12px;
          line-height: 1.55;
          padding-top: 4px;
          border-top: 1px solid var(--theme-elevation-200);
        }
        .rq-loading {
          font-size: 13px;
          color: var(--theme-elevation-500);
        }
      `}</style>

      <div className="rq-card">
        {/* Header */}
        <div className="rq-header">
          <div className="rq-title-row">
            <div className="rq-dot" style={{ background: status?.dot ?? '#888' }} />
            <span className="rq-title">Email Delivery Status</span>
            {quota && !quota.error && isFreePlan && (
              <span className="rq-badge">Free Plan</span>
            )}
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

        {/* Body */}
        {!quota ? (
          <span className="rq-loading">Loading…</span>
        ) : quota.error ? (
          <span className="rq-loading">Could not retrieve quota: {quota.error}</span>
        ) : (
          <>
            <div className="rq-rows">
              {isFreePlan && quota.dailyUsed !== null && (
                <QuotaRow used={quota.dailyUsed} limit={FREE_DAILY_LIMIT} label="Today" />
              )}
              {quota.monthlyUsed !== null && (
                <QuotaRow
                  used={quota.monthlyUsed}
                  limit={FREE_MONTHLY_LIMIT}
                  label="This Month"
                />
              )}
            </div>

            {status && (
              <div className="rq-status" style={{ color: status.color === '#16a34a' ? 'var(--theme-elevation-500)' : status.color }}>
                {status.message}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
