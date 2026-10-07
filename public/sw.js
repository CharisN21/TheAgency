// The Agency: shows banners sent by the server, and opens the right page when one is tapped.
// iPhone and Safari require every push to show a banner, so none is ever skipped.

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))

// Only addresses inside the app: a banner can never send someone to another site.
const inApp = (href) =>
  typeof href === "string" && href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/\\") ? href : "/today"

self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(String(data.title || "The Agency").slice(0, 120), {
        body: data.body ? String(data.body).slice(0, 120) : undefined,
        icon: inApp(data.icon) === "/today" ? "/icon-192.png" : inApp(data.icon),
        badge: "/icon-192.png",
        tag: data.tag ? String(data.tag) : undefined,
        data: { href: inApp(data.href) },
      })
      // An open window refreshes its bell straight away.
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      windows.forEach((w) => w.postMessage({ type: "push" }))
    })(),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = new URL(inApp(event.notification.data && event.notification.data.href), self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin)
      if (open) {
        await open.focus()
        if ("navigate" in open) await open.navigate(url)
        return
      }
      await self.clients.openWindow(url)
    })(),
  )
})
