'use client'

import React from 'react'

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: '20px' }}>
    <div style={{
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--theme-elevation-500)',
      marginBottom: '10px',
    }}>
      {title}
    </div>
    {children}
  </div>
)

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    display: 'flex',
    gap: '8px',
    fontSize: '13px',
    lineHeight: 1.6,
    color: 'var(--theme-text)',
    marginBottom: '4px',
  }}>
    <span style={{ color: 'var(--theme-elevation-400)', flexShrink: 0 }}>•</span>
    <span>{children}</span>
  </div>
)

const Arrow = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    display: 'flex',
    gap: '8px',
    fontSize: '13px',
    lineHeight: 1.6,
    color: 'var(--theme-text)',
    marginBottom: '4px',
    paddingLeft: '12px',
  }}>
    <span style={{ color: '#ea580c', flexShrink: 0 }}>→</span>
    <span>{children}</span>
  </div>
)

const Code = ({ children }: { children: React.ReactNode }) => (
  <code style={{
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: '11px',
    background: 'var(--theme-elevation-150)',
    padding: '1px 5px',
    borderRadius: '3px',
    color: 'var(--theme-text)',
  }}>
    {children}
  </code>
)

const Divider = () => (
  <div style={{
    borderTop: '1px solid var(--theme-elevation-100)',
    margin: '20px 0',
  }} />
)

export default function ECommerceGuide() {
  return (
    <div style={{
      marginTop: '32px',
      padding: '20px 24px',
      borderRadius: '6px',
      border: '1px solid var(--theme-elevation-200)',
      background: 'var(--theme-elevation-50)',
    }}>
      <div style={{
        fontSize: '14px',
        fontWeight: 700,
        marginBottom: '4px',
        color: 'var(--theme-text)',
      }}>
        Operations Guide — Bookings, Payments & Refunds
      </div>
      <div style={{
        fontSize: '12px',
        color: 'var(--theme-elevation-500)',
        marginBottom: '20px',
      }}>
        Reference this guide any time you need to record a payment or cancellation.
      </div>

      <Section title="Online booking (paid through website)">
        <Bullet>Attendee books and pays via Square checkout</Bullet>
        <Bullet><><Code>Amount Paid</Code> and <Code>Square Payment ID</Code> are auto-filled</></Bullet>
        <Bullet>To cancel and refund: leave <Code>Cancel without issuing a refund</Code> unchecked → set status to Cancelled → Square refund issues automatically</Bullet>
        <Bullet>To cancel without refunding: check <Code>Cancel without issuing a refund</Code> first → <Code>Manual Refund Amount</Code> field appears → leave it blank → set status to Cancelled</Bullet>
        <Bullet>To cancel and record a refund you gave outside the CMS (e.g. cash back): check <Code>Cancel without issuing a refund</Code> → enter amount in <Code>Manual Refund Amount</Code> → set status to Cancelled</Bullet>
      </Section>

      <Divider />

      <Section title="Manual booking (cash, POS, Square Terminal)">
        <Bullet>Create the booking manually, enter <Code>Amount Paid</Code> yourself — no <Code>Square Payment ID</Code> will be set</Bullet>
        <Bullet>To cancel: <Code>Cancel without issuing a refund</Code> doesn&apos;t matter (nothing for Square to refund) → set status to Cancelled</Bullet>
        <Bullet>If you gave the attendee a refund outside the CMS: check <Code>Cancel without issuing a refund</Code> → enter amount in <Code>Manual Refund Amount</Code> → set status to Cancelled</Bullet>
        <Bullet>If no refund was given: set status to Cancelled, leave <Code>Manual Refund Amount</Code> blank</Bullet>
      </Section>

      <Divider />

      <Section title="The simple rule">
        <Arrow><><Code>Cancel without issuing a refund</Code> only does anything when a <Code>Square Payment ID</Code> exists — it prevents the automatic Square refund</></Arrow>
        <Arrow><><Code>Manual Refund Amount</Code> is purely for record-keeping so your reports stay accurate — it never moves money</>
        </Arrow>
      </Section>
    </div>
  )
}
