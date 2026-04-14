'use client'

import { useRowLabel } from '@payloadcms/ui'

export default function DayRowLabel() {
  const { rowNumber } = useRowLabel()
  return <span>Day {(rowNumber ?? 0) + 1}</span>
}
