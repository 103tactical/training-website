/**
 * Persists the last known Resend quota values to disk so the admin
 * dashboard can display them without making a live API call.
 *
 * In production (Render) the file lives on the persistent disk at
 * /var/data/resend-quota.json so it survives restarts.
 * Locally it falls back to /tmp/resend-quota.json.
 */
import { writeFile, readFile } from 'fs/promises'
import { join, dirname } from 'path'

export interface QuotaCache {
  dailyUsed:   number | null
  monthlyUsed: number | null
  updatedAt:   string
}

function cachePath(): string {
  // MEDIA_STATIC_DIR is /var/data/media in production — step up one level
  const dir = process.env.MEDIA_STATIC_DIR
    ? dirname(process.env.MEDIA_STATIC_DIR)
    : '/tmp'
  return join(dir, 'resend-quota.json')
}

export async function saveQuota(dailyUsed: number | null, monthlyUsed: number | null): Promise<void> {
  try {
    const cache: QuotaCache = { dailyUsed, monthlyUsed, updatedAt: new Date().toISOString() }
    await writeFile(cachePath(), JSON.stringify(cache), 'utf-8')
  } catch {
    // Non-fatal — dashboard will just show zeros
  }
}

export async function loadQuota(): Promise<QuotaCache | null> {
  try {
    const raw = await readFile(cachePath(), 'utf-8')
    return JSON.parse(raw) as QuotaCache
  } catch {
    return null
  }
}
