import "server-only"

import webpush from "web-push"

import { mutate, readDb } from "@/lib/data/store"
import type { PushItem } from "./outbox"

/**
 * Sends banners to the phones and laptops people have turned notifications on
 * for. Does nothing, quietly, when no keys are set, so the app runs the same
 * on a laptop without them. A failure to send never breaks the action that
 * caused it: the notification row is already saved and shows in the bell.
 */
export function pushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT,
  )
}

export async function deliverPush(items: PushItem[]): Promise<{ sent: number; removed: number }> {
  if (items.length === 0 || !pushConfigured()) return { sent: 0, removed: 0 }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )

  const db = await readDb()
  const gone = new Set<string>()
  let sent = 0

  await Promise.allSettled(
    items.flatMap((item) =>
      db.push_subscriptions
        .filter((s) => s.user_id === item.user_id)
        .map(async (s) => {
          const payload = JSON.stringify({ title: item.title, body: item.workspace, href: item.href ?? "/today", tag: item.tag })
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
              TTL: 60 * 60,
              timeout: 5000,
            })
            sent++
          } catch (e) {
            const code = (e as { statusCode?: number }).statusCode
            // 404 and 410 mean the device no longer wants them: forget it.
            if (code === 404 || code === 410) gone.add(s.id)
            else console.error("Push not sent:", code ?? (e as Error).message)
          }
        }),
    ),
  )

  if (gone.size > 0) {
    await mutate((d) => {
      d.push_subscriptions = d.push_subscriptions.filter((s) => !gone.has(s.id))
    })
  }
  return { sent, removed: gone.size }
}
