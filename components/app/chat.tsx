"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { Loader2, Lock, MessageSquare, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  createChannelKey,
  createDeviceKeys,
  exportPublicKey,
  openMessage,
  sealMessage,
  unwrapChannelKey,
  wrapChannelKey,
} from "@/lib/crypto/e2ee"
import { deviceName, getStoredDevice, storeDevice, type StoredDevice } from "@/lib/crypto/device-store"
import {
  loadChannel,
  loadChannels,
  markChannelRead,
  postMessage,
  registerDevice,
  rotateChannel,
  type ChannelState,
} from "@/lib/data/actions"

/* ------------------------------------------------------------- context */

const ChatContext = createContext<{ open: () => void; unread: number } | null>(null)

/** The bubble in the top bar. Opens the chat drawer; Ctrl J does the same. */
export function ChatButton() {
  const chat = useContext(ChatContext)
  if (!chat) return null
  const label = chat.unread > 0 ? `Team chat, ${chat.unread} unread` : "Team chat"
  return (
    <Button variant="ghost" size="icon" aria-label={label} title="Team chat (Ctrl J)" className="relative" onClick={chat.open}>
      <MessageSquare />
      {chat.unread > 0 && (
        <span className="bg-primary text-primary-foreground absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] leading-none font-semibold tabular-nums">
          {chat.unread > 9 ? "9+" : chat.unread}
        </span>
      )}
    </Button>
  )
}

/* -------------------------------------------------------------- drawer */

type Line = { id: string; sender: string; mine: boolean; at: string; text?: string }

const time = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" })

/**
 * Team chat, end-to-end encrypted. Everything is sealed and opened here, in
 * the browser; the server only ever receives sealed text.
 */
export function ChatProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle")
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<ChannelState | null>(null)
  const [lines, setLines] = useState<Line[]>([])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)

  const device = useRef<StoredDevice | null>(null)
  const channelId = useRef<string | null>(null)
  const keys = useRef(new Map<number, CryptoKey>())
  const bottom = useRef<HTMLDivElement>(null)

  // Ctrl J (Cmd J on a Mac) opens and closes the drawer from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // The unread count for the bubble, checked every half minute while the drawer is shut.
  useEffect(() => {
    if (isOpen) return
    let stop = false
    const check = async () => {
      const stored = await getStoredDevice(userId).catch(() => undefined)
      const r = await loadChannels(stored?.deviceId ?? "")
      if (!stop) setUnread(r.channels.reduce((n, c) => n + c.unread, 0))
    }
    void check()
    const t = setInterval(check, 30_000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [isOpen, userId])

  /** This browser's device: found in IndexedDB, or made and added now. */
  const ensureDevice = useCallback(async () => {
    const stored = await getStoredDevice(userId)
    const r = await loadChannels(stored?.deviceId ?? "")
    if (stored && r.deviceKnown) {
      device.current = stored
      return r.channels
    }
    const pair = await createDeviceKeys()
    const added = await registerDevice(deviceName(), await exportPublicKey(pair.publicKey))
    if (!added.ok || !added.deviceId) throw new Error(added.message)
    device.current = { deviceId: added.deviceId, keys: pair }
    await storeDevice(userId, device.current)
    keys.current.clear()
    setNotice("This device was added to your chat. Messages sent before now cannot be read here.")
    return (await loadChannels(added.deviceId)).channels
  }, [userId])

  /** Makes a new channel key and wraps it for every device that should hold it. */
  const rotate = useCallback(async (s: ChannelState) => {
    const me = device.current!
    const epoch = s.channel.epoch + 1
    const key = await createChannelKey()
    const wrapped = await Promise.all(
      s.devices.map(async (d) => ({
        device_id: d.id,
        wrapped_key: await wrapChannelKey(key, me.keys.privateKey, { deviceId: d.id, publicKey: d.public_key }, {
          channelId: s.channel.id,
          epoch,
        }),
      })),
    )
    return rotateChannel(s.channel.id, me.deviceId, epoch, wrapped)
  }, [])

  /** Loads the channel, refreshes the key if people or devices changed, and opens every message it can. */
  const refresh = useCallback(async (): Promise<ChannelState | null> => {
    const me = device.current
    const id = channelId.current
    if (!me || !id) return null
    let r = await loadChannel(id, me.deviceId)
    for (let tries = 0; r.ok && r.state.rotationNeeded && tries < 3; tries++) {
      await rotate(r.state)
      r = await loadChannel(id, me.deviceId)
    }
    if (!r.ok) throw new Error(r.message)
    const s = r.state

    for (const k of s.keys) {
      if (keys.current.has(k.epoch)) continue
      try {
        keys.current.set(
          k.epoch,
          await unwrapChannelKey(k.wrapped_key, me.keys.privateKey, me.deviceId, k.wrapper_public_key, {
            channelId: s.channel.id,
            epoch: k.epoch,
          }),
        )
      } catch {
        // A key that does not open is skipped; its messages show as unreadable.
      }
    }

    const names = new Map(s.people.map((p) => [p.id, p.name.split(" ")[0]]))
    const opened = await Promise.all(
      s.messages.map(async (m): Promise<Line> => {
        const line = { id: m.id, sender: names.get(m.sender_id) ?? "Someone", mine: m.sender_id === userId, at: m.created_at }
        const key = keys.current.get(m.epoch)
        if (!key) return line
        try {
          const body = await openMessage(key, m, { channelId: s.channel.id, epoch: m.epoch, senderDeviceId: m.sender_device_id })
          return { ...line, text: body.text }
        } catch {
          return line
        }
      }),
    )
    setState(s)
    setLines(opened)
    void markChannelRead(s.channel.id)
    return s
  }, [rotate, userId])

  // Opening the drawer: make sure of the device, open #general, then keep it fresh every few seconds.
  useEffect(() => {
    if (!isOpen) return
    let stop = false
    const start = async () => {
      setStatus("loading")
      setError(null)
      try {
        const channels = await ensureDevice()
        channelId.current = channels.find((c) => c.name === "general")?.id ?? null
        await refresh()
        if (!stop) {
          setStatus("ready")
          setUnread(0)
        }
      } catch (e) {
        if (!stop) {
          setStatus("error")
          setError(e instanceof Error ? e.message : "Chat could not open")
        }
      }
    }
    void start()
    const t = setInterval(() => void refresh().catch(() => {}), 4_000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [isOpen, ensureDevice, refresh])

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" })
  }, [lines.length])

  const send = async () => {
    const text = draft.trim()
    const me = device.current
    if (!text || !me || !state) return
    setSending(true)
    try {
      for (let tries = 0; tries < 2; tries++) {
        const s = await refresh()
        if (!s) throw new Error("Chat could not open")
        const epoch = s.channel.epoch
        const key = keys.current.get(epoch)
        if (!key) throw new Error("This device does not have the channel key yet. Try again in a moment.")
        const sealed = await sealMessage(key, { text }, { channelId: state.channel.id, epoch, senderDeviceId: me.deviceId })
        const r = await postMessage(state.channel.id, me.deviceId, epoch, sealed)
        if (r.ok) {
          setDraft("")
          await refresh()
          return
        }
        if (tries === 1) throw new Error(r.message)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not send")
    } finally {
      setSending(false)
    }
  }

  const unreadable = lines.filter((l) => l.text === undefined).length

  return (
    <ChatContext.Provider value={{ open: () => setOpen(true), unread }}>
      {children}
      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-border border-b">
            <SheetTitle># general</SheetTitle>
            <SheetDescription className="flex items-center gap-1.5">
              <Lock className="size-3.5 shrink-0" />
              {state
                ? `Encrypted. Only the ${state.memberCount} ${state.memberCount === 1 ? "person" : "people"} in this workspace can read it.`
                : "Encrypted. Only people in this workspace can read it."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-3" aria-live="polite">
            {status === "loading" && lines.length === 0 && (
              <p className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
                <Loader2 className="size-4 animate-spin" /> Opening the channel on this device
              </p>
            )}
            {notice && <p className="bg-accent text-accent-foreground mb-3 rounded-lg px-3 py-2 text-sm">{notice}</p>}
            {unreadable > 0 && (
              <p className="text-muted-foreground mb-3 text-xs">
                {unreadable === 1 ? "1 message was" : `${unreadable} messages were`} sent before this device could read
                the channel, so {unreadable === 1 ? "it stays" : "they stay"} closed here.
              </p>
            )}
            {status === "ready" && lines.length === 0 && (
              <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-10 text-center text-sm">
                No messages yet. Say hello to the team.
              </p>
            )}
            <ol className="flex flex-col gap-3">
              {lines
                .filter((l) => l.text !== undefined)
                .map((l) => (
                  <li key={l.id}>
                    <p className="text-muted-foreground text-xs">
                      <span className="text-foreground font-semibold">{l.mine ? "You" : l.sender}</span> · {time(l.at)}
                    </p>
                    <p className="text-sm leading-snug whitespace-pre-wrap">{l.text}</p>
                  </li>
                ))}
            </ol>
            <div ref={bottom} />
          </div>

          <form
            className="border-border flex items-end gap-2 border-t p-3"
            onSubmit={(e) => {
              e.preventDefault()
              void send()
            }}
          >
            <div className="flex-1">
              {error && <p className="text-destructive mb-1.5 text-xs">Error: {error}</p>}
              <label htmlFor="chat-draft" className="sr-only">
                Message #general
              </label>
              <Textarea
                id="chat-draft"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    void send()
                  }
                }}
                placeholder="Message #general"
                rows={1}
                maxLength={4000}
                disabled={status !== "ready"}
                className="max-h-40 min-h-11 resize-none"
              />
            </div>
            <Button type="submit" size="icon" className="size-11" disabled={sending || !draft.trim() || status !== "ready"} aria-label="Send">
              {sending ? <Loader2 className="animate-spin" /> : <Send />}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </ChatContext.Provider>
  )
}
