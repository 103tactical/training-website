'use client'
/**
 * Admin input that PRESENTS dollars while STORING integer cents.
 *
 * The database keeps cents (webhook, Square refunds, and all reporting
 * depend on it) — this component only changes what the admin sees and
 * types. Attach via admin.components.Field on any cents-backed number
 * field; label comes from the field config.
 *
 * Validation:
 *  - non-numeric input → inline error, value untouched
 *  - negative amounts → inline error, value untouched
 *  - sub-cent precision → rounded to the nearest cent (shown back)
 *  - amounts over $5,000 → saved, but with a "did you mean…?" warning,
 *    to catch the old enter-cents habit (60000 ⇒ $60,000)
 */
import React from 'react'
import { useField, FieldLabel } from '@payloadcms/ui'
import type { NumberFieldClientComponent } from 'payload'

const SANITY_LIMIT_DOLLARS = 5000

const DollarsField: NumberFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue } = useField<number>({ path })

  // Local text state so partial entries like "225." survive typing
  const [text, setText] = React.useState<string>(
    typeof value === 'number' ? (value / 100).toFixed(2) : '',
  )
  const [error, setError] = React.useState<string | null>(null)
  const [warning, setWarning] = React.useState<string | null>(null)

  // Reflect external changes (e.g. webhook-populated values on load)
  React.useEffect(() => {
    if (typeof value === 'number') {
      const current = parseFloat(text)
      if (!Number.isFinite(current) || Math.round(current * 100) !== value) {
        setText((value / 100).toFixed(2))
      }
    } else if (value === null || value === undefined) {
      if (text !== '') setText('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const commit = (raw: string) => {
    setError(null)
    setWarning(null)

    const trimmed = raw.trim().replace(/^\$/, '').replace(/,/g, '')
    if (trimmed === '') {
      setValue(null)
      return
    }

    // Strict numeric shape: digits with optional single decimal point.
    // Rejects "abc", "225abc", "2.2.5", "1e5" — parseFloat would let some through.
    if (!/^\d*\.?\d+$/.test(trimmed)) {
      setError('Enter a dollar amount, e.g. 225 or 225.00')
      return
    }

    const dollars = parseFloat(trimmed)
    if (!Number.isFinite(dollars) || dollars < 0) {
      setError('Amount cannot be negative.')
      return
    }

    const cents = Math.round(dollars * 100)

    // Sub-cent input: accept, but show what it became
    const hadSubCent = Math.abs(dollars * 100 - cents) > 1e-9

    if (dollars > SANITY_LIMIT_DOLLARS) {
      const asIfCents = (dollars / 100).toFixed(2)
      setWarning(
        `That's $${dollars.toLocaleString('en-US', { minimumFractionDigits: 2 })} — unusually large. ` +
        `If you meant $${asIfCents}, re-enter it as ${asIfCents}. (This field takes dollars, not cents.)`,
      )
    } else if (hadSubCent) {
      setWarning(`Rounded to the nearest cent: $${(cents / 100).toFixed(2)}`)
    }

    setValue(cents)
    setText((cents / 100).toFixed(2))
  }

  return (
    <div className="field-type number" style={{ marginBottom: 'var(--spacing-field, 24px)' }}>
      <FieldLabel label={field?.label} path={path} required={field?.required} />
      <div style={{ position: 'relative' }}>
        <span
          style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--theme-elevation-400)', pointerEvents: 'none', fontSize: '14px',
          }}
        >
          $
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={text}
          disabled={readOnly}
          placeholder="0.00"
          aria-invalid={Boolean(error)}
          onChange={(e) => { setText(e.target.value); if (error) setError(null) }}
          onBlur={(e) => commit(e.target.value)}
          style={{
            width: '100%', padding: '8px 12px 8px 26px',
            background: 'var(--theme-input-bg, var(--theme-elevation-0))',
            border: `1px solid ${error ? 'var(--theme-error-500, #dc2626)' : 'var(--theme-elevation-150)'}`,
            borderRadius: 'var(--style-radius-s, 4px)',
            color: 'var(--theme-text)', fontSize: '14px', lineHeight: '20px',
          }}
        />
      </div>
      {error ? (
        <p role="alert" style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--theme-error-500, #dc2626)', lineHeight: 1.4 }}>
          {error}
        </p>
      ) : null}
      {!error && warning ? (
        <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#ea580c', fontWeight: 600, lineHeight: 1.4 }}>
          {warning}
        </p>
      ) : null}
      {!error && !warning && field?.admin?.description ? (
        <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--theme-elevation-400)', lineHeight: 1.4 }}>
          {String(field.admin.description)}
        </p>
      ) : null}
    </div>
  )
}

export default DollarsField
