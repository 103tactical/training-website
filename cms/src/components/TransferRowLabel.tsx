'use client'

import { useRowLabel } from '@payloadcms/ui'

/**
 * Row label for each entry in the transferHistory array.
 * Displays "Transferred on Mar 4, 2026, 3:45 PM".
 */
export default function TransferRowLabel() {
  const { data } = useRowLabel()

  const raw = (data as Record<string, unknown>)?.transferredAt
  const formatted = raw
    ? new Date(raw as string).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Unknown date'

  return <span>Transferred on {formatted}</span>
}
