import React from 'react'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { SetStepNav } from '@payloadcms/ui'
import NotificationsTable from './NotificationsTable'
import type { NotificationRow } from './NotificationsTable'

/**
 * Notifications page (/admin/notifications) — the list of undismissed
 * "needs your attention" reminders. The standing header explains the
 * contract once (these are reminders; dismissing never deletes anything)
 * so each row stays short. Rows and dismissal live in NotificationsTable
 * (client component).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function NotificationsPage(props: any) {
  const { initPageResult } = props
  const params       = await Promise.resolve(props.params)
  const searchParams = await Promise.resolve(props.searchParams)
  const payload      = initPageResult.req.payload

  const { docs } = await payload.find({
    collection: 'notifications',
    where: { dismissed: { not_equals: true } },
    sort: '-createdAt',
    limit: 200,
    depth: 0,
    overrideAccess: true,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: NotificationRow[] = (docs as any[]).map((d) => ({
    id: d.id,
    whatHappened: d.whatHappened ?? '',
    whatToDo: d.whatToDo ?? '',
    link: d.link ?? null,
    linkLabel: d.linkLabel ?? null,
    createdAt: d.createdAt,
  }))

  return (
    <DefaultTemplate
      i18n={initPageResult.req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={payload}
      permissions={initPageResult.permissions}
      req={initPageResult.req}
      searchParams={searchParams}
      user={initPageResult.req.user ?? undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
      <SetStepNav nav={[{ label: 'Notifications' }]} />
      <div style={{
        maxWidth: '1100px',
        paddingLeft: 'var(--gutter-h, 24px)',
        paddingRight: 'var(--gutter-h, 24px)',
        paddingBottom: '48px',
      }}>
        <div style={{ marginBottom: '24px', paddingTop: '8px' }}>
          <h1 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: 700 }}>Notifications</h1>
          <p style={{ margin: 0, color: 'var(--theme-elevation-500, #888)', fontSize: '14px', lineHeight: 1.6, maxWidth: '760px' }}>
            Reminders about things that may need your attention. Dismissing one just clears it
            from this list — it never deletes an email, a message, or a booking.
          </p>
        </div>

        <NotificationsTable initialRows={rows} />
      </div>
    </DefaultTemplate>
  )
}
