import React from 'react'
import Link from 'next/link'

// ── Resend quota fetch ────────────────────────────────────────────────────────

interface ResendQuota {
  dailyUsed:    number | null   // null = paid plan (no daily cap)
  monthlyUsed:  number | null   // null = fetch failed
  error:        string | null
}

async function fetchResendQuota(): Promise<ResendQuota> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { dailyUsed: null, monthlyUsed: null, error: 'RESEND_API_KEY not configured' }

  try {
    // GET /domains is a lightweight read-only call; we only care about response headers
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    })

    const daily   = res.headers.get('x-resend-daily-quota')
    const monthly = res.headers.get('x-resend-monthly-quota')

    return {
      dailyUsed:   daily   !== null ? parseInt(daily,   10) : null,
      monthlyUsed: monthly !== null ? parseInt(monthly, 10) : null,
      error: null,
    }
  } catch (err) {
    return { dailyUsed: null, monthlyUsed: null, error: String(err) }
  }
}

// ── Quota widget ──────────────────────────────────────────────────────────────

const FREE_DAILY_LIMIT   = 100
const FREE_MONTHLY_LIMIT = 3_000

function QuotaBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const pct   = Math.min(100, Math.round((used / limit) * 100))
  const color = pct >= 90 ? '#b91c1c' : pct >= 70 ? '#d97706' : '#16a34a'
  const remaining = Math.max(0, limit - used)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: '180px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--theme-elevation-500, #888)' }}>
          {label}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--theme-text)', fontVariantNumeric: 'tabular-nums' }}>
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div style={{ height: '6px', background: 'var(--theme-elevation-200, #333)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '11px', color: pct >= 90 ? color : 'var(--theme-elevation-500, #888)' }}>
        {pct >= 100
          ? '⚠ Limit reached — emails paused until quota resets'
          : `${remaining.toLocaleString()} remaining`}
      </span>
    </div>
  )
}

function ResendQuotaWidget({ quota }: { quota: ResendQuota }) {
  const isFreePlan = quota.dailyUsed !== null

  // Status dot colour based on worst metric
  const dailyPct   = isFreePlan && quota.dailyUsed !== null
    ? Math.round((quota.dailyUsed   / FREE_DAILY_LIMIT)   * 100) : 0
  const monthlyPct = quota.monthlyUsed !== null
    ? Math.round((quota.monthlyUsed / FREE_MONTHLY_LIMIT) * 100) : 0
  const worstPct   = Math.max(dailyPct, monthlyPct)
  const dotColor   = quota.error ? '#888'
    : worstPct >= 90 ? '#b91c1c'
    : worstPct >= 70 ? '#d97706'
    : '#16a34a'

  return (
    <div style={{
      background: 'var(--theme-elevation-100, #1a1a1a)',
      borderRadius: '8px',
      padding: '16px 20px',
      marginBottom: '28px',
      border: worstPct >= 90 ? '1px solid #b91c1c44' : '1px solid transparent',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: quota.error ? 0 : '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--theme-text)' }}>
            Email Service — Resend
          </span>
          {isFreePlan && (
            <span style={{
              fontSize: '10px', fontWeight: 600, padding: '2px 6px',
              background: 'var(--theme-elevation-200)', borderRadius: '4px',
              color: 'var(--theme-elevation-500)', textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Free Plan
            </span>
          )}
        </div>
        <a
          href="https://resend.com/settings/usage"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '12px', color: '#ea580c', textDecoration: 'none' }}
        >
          View in Resend →
        </a>
      </div>

      {quota.error ? (
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--theme-elevation-500, #888)' }}>
          Could not retrieve quota: {quota.error}
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {isFreePlan && quota.dailyUsed !== null && (
              <QuotaBar used={quota.dailyUsed} limit={FREE_DAILY_LIMIT} label="Today" />
            )}
            {quota.monthlyUsed !== null && (
              <QuotaBar
                used={quota.monthlyUsed}
                limit={FREE_MONTHLY_LIMIT}
                label={isFreePlan ? 'This Month' : 'Monthly (free limit)'}
              />
            )}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: '11px', color: 'var(--theme-elevation-400, #666)', lineHeight: 1.4 }}>
            {isFreePlan
              ? 'Free plan: 100 emails/day · 3,000 emails/month. Daily quota resets at midnight UTC; monthly on your billing date.'
              : 'Paid plan: no daily limit. Monthly quota resets on your billing date.'}
            {' '}Upgrade at{' '}
            <a href="https://resend.com/settings/billing" target="_blank" rel="noopener noreferrer" style={{ color: '#ea580c' }}>
              resend.com/settings/billing
            </a>.
          </p>
        </>
      )}
    </div>
  )
}

// ── Navigation sections ───────────────────────────────────────────────────────

const SECTIONS = [
  {
    label: 'Course Management',
    links: [
      { href: '/admin/schedule-dashboard',               label: 'Course Calendar' },
      { href: '/admin/collections/courses',              label: 'Courses' },
      { href: '/admin/collections/course-groups',        label: 'Course Groups' },
      { href: '/admin/collections/course-schedules',     label: 'Course Schedules' },
      { href: '/admin/collections/pending-bookings',     label: 'Pending Bookings' },
      { href: '/admin/collections/bookings',             label: 'Bookings' },
      { href: '/admin/collections/attendees',            label: 'Attendees' },
      { href: '/admin/collections/instructors',          label: 'Instructors' },
    ],
  },
  {
    label: 'Accounting & Reports',
    links: [
      { href: '/admin/reporting/dashboard', label: 'Overview' },
      { href: '/admin/reporting/revenue',   label: 'Revenue Report' },
      { href: '/admin/reporting/bookings',  label: 'Bookings Report' },
      { href: '/admin/reporting/refunds',   label: 'Refunds & Cancellations' },
    ],
  },
  {
    label: 'Data',
    links: [
      { href: '/admin/collections/contact-submissions', label: 'Contact Submissions' },
    ],
  },
  {
    label: 'Page Content',
    links: [
      { href: '/admin/globals/home-page',         label: 'Home Page' },
      { href: '/admin/globals/courses-page',      label: 'Courses Page' },
      { href: '/admin/globals/applications-page', label: 'Applications Page' },
      { href: '/admin/globals/store-page',        label: 'Store Page' },
      { href: '/admin/globals/contact-settings',  label: 'Contact Page' },
    ],
  },
  {
    label: 'Configuration',
    links: [
      { href: '/admin/globals/site-settings', label: 'Site Settings' },
      { href: '/admin/globals/utility',        label: 'Site Utilities' },
    ],
  },
  {
    label: 'Collections',
    links: [
      { href: '/admin/collections/users',  label: 'Users' },
      { href: '/admin/collections/media',  label: 'Media' },
      { href: '/admin/collections/badges', label: 'Badges' },
    ],
  },
]

export default async function AdminDashboard() {
  const quota = await fetchResendQuota()

  return (
    <div style={{
      padding: '2.5rem',
      maxWidth: '960px',
    }}>
      <h1 style={{
        fontSize: '1.5rem',
        fontWeight: 700,
        marginBottom: '2rem',
        color: 'var(--theme-text)',
      }}>
        Dashboard
      </h1>

      <ResendQuotaWidget quota={quota} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {SECTIONS.map((section) => (
          <div key={section.label}>
            {/* Orange-highlighted section header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '12px',
            }}>
              <div style={{
                width: '3px',
                height: '18px',
                borderRadius: '2px',
                background: '#ea580c',
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#ea580c',
              }}>
                {section.label}
              </span>
            </div>

            {/* Link cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '8px',
            }}>
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={false}
                  className="adash-card"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
