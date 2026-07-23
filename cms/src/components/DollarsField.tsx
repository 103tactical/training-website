'use client'
/**
 * Admin input that PRESENTS dollars while STORING integer cents.
 *
 * The database keeps cents (webhook, Square refunds, and all reporting
 * depend on it) — this component only changes what the admin sees and
 * types. Attach via admin.components.Field on any cents-backed number
 * field; label comes from the field config.
 */
import React from 'react'
import { useField, FieldLabel } from '@payloadcms/ui'
import type { NumberFieldClientComponent } from 'payload'

const DollarsField: NumberFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue } = useField<number>({ path })

  // Local text state so partial entries like "225." survive typing
  const [text, setText] = React.useState<string>(
    typeof value === 'number' ? (value / 100).toFixed(2) : '',
  )

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
    const trimmed = raw.trim().replace(/^\$/, '')
    if (trimmed === '') { setValue(null); return }
    const dollars = parseFloat(trimmed)
    if (Number.isFinite(dollars) && dollars >= 0) {
      const cents = Math.round(dollars * 100)
      setValue(cents)
      setText((cents / 100).toFixed(2))
    }
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
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          style={{
            width: '100%', padding: '8px 12px 8px 26px',
            background: 'var(--theme-input-bg, var(--theme-elevation-0))',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 'var(--style-radius-s, 4px)',
            color: 'var(--theme-text)', fontSize: '14px', lineHeight: '20px',
          }}
        />
      </div>
      {field?.admin?.description ? (
        <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--theme-elevation-400)', lineHeight: 1.4 }}>
          {String(field.admin.description)}
        </p>
      ) : null}
    </div>
  )
}

export default DollarsField
