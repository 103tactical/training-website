import type { Payload } from 'payload'

/**
 * Auto-dismiss any dashboard notifications whose action link points at a
 * document that was just deleted, so the Notifications page never shows a
 * button leading to a "not found" page.
 *
 * Called from afterDelete hooks. Deliberately runs DETACHED from the delete's
 * transaction (no `req` is passed, so these reads/writes use their own
 * transaction): notifications live in a different table, so there is no lock
 * contention with the delete, and a failure here can never poison or roll
 * back the delete itself — see the ContactSubmissions transaction lessons in
 * CLAUDE.md. Non-fatal by design: a leftover notification is a nuisance,
 * never worth failing a delete over.
 */
export async function dismissNotificationsLinkingTo(
  payload: Payload,
  link: string,
): Promise<void> {
  try {
    const { docs } = await payload.find({
      collection: 'notifications',
      where: {
        and: [{ link: { equals: link } }, { dismissed: { not_equals: true } }],
      },
      limit: 20,
      depth: 0,
    })
    for (const doc of docs) {
      await payload.update({
        collection: 'notifications',
        id: doc.id,
        data: { dismissed: true },
      })
    }
    if (docs.length > 0) {
      payload.logger.info(
        `[notifications] auto-dismissed ${docs.length} notification(s) linking to deleted ${link}`,
      )
    }
  } catch (err) {
    payload.logger.error(
      `[notifications] auto-dismiss failed for ${link}: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}
