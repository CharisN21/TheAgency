"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Bell, BellOff, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  pushStatus,
  removePushDevice,
  savePushDevice,
  sendTestPush,
  setBannerSettings,
  type PushStatus,
} from "@/lib/data/actions"
import type { BannerSettings } from "@/lib/data/queries"

type Support = "checking" | "ready" | "needs-install" | "unsupported"

/** "Chrome on Windows", "Safari on iPhone": enough to tell your devices apart. */
function deviceLabel() {
  const ua = navigator.userAgent
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /Mac/.test(ua)
            ? "Mac"
            : "Linux"
  const app = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser"
  return `${app} on ${os}`
}

function keyBytes(base64Url: string) {
  const padded = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(padded)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

/** Settings: turn banners on for this phone or laptop, see your devices, send a test. */
export function PushCard() {
  const [support, setSupport] = useState<Support>("checking")
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [status, setStatus] = useState<PushStatus | null>(null)
  const [thisId, setThisId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pending, start] = useTransition()

  const refresh = useCallback(async () => {
    const ios = /iPhone|iPad/.test(navigator.userAgent)
    const installed =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true
    if (ios && !installed) return setSupport("needs-install")
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return setSupport("unsupported")
    }
    setSupport("ready")
    setPermission(Notification.permission)
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js")
      const sub = await reg?.pushManager.getSubscription()
      const s = await pushStatus(sub?.endpoint)
      setStatus(s)
      setThisId(s.thisDeviceId)
    } catch {
      setStatus(null)
    }
  }, [])

  useEffect(() => {
    // Reads the browser's own state, which only exists once the page is open here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  async function turnOn() {
    if (!status) return
    setBusy(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== "granted") {
        toast.error("Banners need your permission. You can allow them in your browser or phone settings.")
        return
      }
      await navigator.serviceWorker.register("/sw.js")
      const reg = await navigator.serviceWorker.ready
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(status.publicKey) }))
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
      const r = await savePushDevice(
        { endpoint: json.endpoint ?? "", keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" } },
        deviceLabel(),
      )
      if (r.ok) toast.success(r.message)
      else toast.error(r.message)
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error && e.message ? `Could not turn banners on: ${e.message}` : "Could not turn banners on")
    } finally {
      setBusy(false)
    }
  }

  async function turnOff() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js")
      await (await reg?.pushManager.getSubscription())?.unsubscribe()
      if (thisId) {
        const r = await removePushDevice(thisId)
        if (r.ok) toast.success(r.message)
        else toast.error(r.message)
      }
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  if (support === "checking") {
    return <p className="text-muted-foreground px-6 text-sm">Checking this device…</p>
  }
  if (support === "needs-install") {
    return (
      <p className="bg-muted text-muted-foreground mx-6 rounded-lg px-4 py-3 text-sm">
        To get banners on an iPhone, add The Agency to your Home Screen (the steps are further down this page), open it from that
        icon, then come back here and turn banners on.
      </p>
    )
  }
  if (support === "unsupported") {
    return (
      <p className="bg-muted text-muted-foreground mx-6 rounded-lg px-4 py-3 text-sm">
        This browser cannot show banners. Chrome, Edge, Firefox and Safari 16 or newer can, and so can an iPhone with the app on its
        Home Screen.
      </p>
    )
  }
  if (status && !status.configured) {
    return (
      <p className="bg-muted text-muted-foreground mx-6 rounded-lg px-4 py-3 text-sm">
        Banners are not set up on this server yet. The bell still works.
      </p>
    )
  }

  const on = thisId !== null
  return (
    <div className="flex flex-col gap-3 px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Banners on this device</p>
          <p className="text-muted-foreground text-sm">
            {on
              ? "On. You get a banner when something happens to your work, even with the app closed."
              : permission === "denied"
                ? "Blocked. Allow notifications for this site in your browser or phone settings, then try again."
                : "Off. Turn on to get a banner on this phone or laptop, even with the app closed."}
          </p>
        </div>
        {on ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={busy || pending}
              onClick={() =>
                start(async () => {
                  const r = await sendTestPush()
                  if (r.ok) toast.success(r.message)
                  else toast.error(r.message)
                })
              }
            >
              {pending ? <Loader2 className="animate-spin" /> : <Bell />} Send a test
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => void turnOff()}>
              {busy ? <Loader2 className="animate-spin" /> : <BellOff />} Turn off
            </Button>
          </div>
        ) : (
          <Button disabled={busy || !status || permission === "denied"} onClick={() => void turnOn()}>
            {busy ? <Loader2 className="animate-spin" /> : <Bell />} Turn on banners
          </Button>
        )}
      </div>

      {status && status.devices.length > 0 && (
        <ul className="divide-border divide-y rounded-lg border">
          {status.devices.map((d) => (
            <li key={d.id} className="flex min-h-12 items-center justify-between gap-3 px-3 py-1">
              <span className="min-w-0 text-sm">
                <span className="block truncate">
                  {d.label}
                  {d.id === thisId ? " (this device)" : ""}
                </span>
                <span className="text-muted-foreground block text-xs">
                  Added {new Date(d.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </span>
              {d.id !== thisId && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await removePushDevice(d.id)
                      if (r.ok) toast.success(r.message)
                      else toast.error(r.message)
                      await refresh()
                    })
                  }
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Settings: banner controls for this workspace only. Someone in two unrelated
 * ventures can silence one and keep the other. Notifications still reach the bell.
 */
export function BannerControls({ workspaceName, initial }: { workspaceName: string; initial: BannerSettings }) {
  const [s, setS] = useState(initial)
  const [pending, start] = useTransition()

  function save(next: BannerSettings) {
    const before = s
    setS(next)
    start(async () => {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const r = await setBannerSettings({ ...next, tz: zone })
      if (r.ok) toast.success(r.message)
      else {
        setS(before)
        toast.error(r.message)
      }
    })
  }

  return (
    <div className="flex flex-col gap-1 px-6">
      <div className="flex min-h-12 items-center justify-between gap-4">
        <label htmlFor="banners-on" className="text-sm">
          <span className="block font-medium">Banners from {workspaceName}</span>
          <span className="text-muted-foreground block">Off means no banner, but the bell still fills.</span>
        </label>
        <Switch id="banners-on" checked={s.banners} disabled={pending} onCheckedChange={(v) => save({ ...s, banners: v })} />
      </div>

      <div className="flex min-h-12 items-center justify-between gap-4">
        <label htmlFor="quiet-on" className="text-sm">
          <span className="block font-medium">Quiet hours</span>
          <span className="text-muted-foreground block">No banners in this window. They wait in the bell.</span>
        </label>
        <Switch id="quiet-on" checked={s.quietOn} disabled={pending || !s.banners} onCheckedChange={(v) => save({ ...s, quietOn: v })} />
      </div>

      {s.quietOn && s.banners && (
        <div className="flex flex-wrap items-center gap-3 pb-2">
          <label className="text-muted-foreground flex items-center gap-2 text-sm">
            From
            <Input
              type="time"
              value={s.quietFrom}
              disabled={pending}
              onChange={(e) => e.target.value && save({ ...s, quietFrom: e.target.value })}
              className="h-11 w-32"
            />
          </label>
          <label className="text-muted-foreground flex items-center gap-2 text-sm">
            To
            <Input
              type="time"
              value={s.quietTo}
              disabled={pending}
              onChange={(e) => e.target.value && save({ ...s, quietTo: e.target.value })}
              className="h-11 w-32"
            />
          </label>
        </div>
      )}
    </div>
  )
}

/** In the app shell: when a banner arrives while the app is open, update the bell at once. */
export function PushListener() {
  const router = useRouter()
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "push") router.refresh()
    }
    navigator.serviceWorker.addEventListener("message", onMessage)
    return () => navigator.serviceWorker.removeEventListener("message", onMessage)
  }, [router])
  return null
}
