"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, ClipboardList, Loader2, Lock, Megaphone, MessageSquare, Plus, Send, UserRound, Users } from "lucide-react"
import { toast } from "sonner"

import { cn } from "cn"
import { handleFor, matchTag, openTag, parseMentions } from "@/lib/chat/mentions"
import type { TaskCard } from "@/lib/chat/card"
import { MessageActions, TaskSuggestion } from "@/components/app/chat-actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  addGroupMembers,
  createGroup,
  loadChannel,
  loadChannels,
  markChannelRead,
  postMessage,
  removeGroupMember,
  startDirectMessage,
  type ChannelState,
  type ChatDirectory,
} from "@/lib/data/actions"

/* ------------------------------------------------------------- context */

const ChatContext = createContext<{
  open: () => void
  /** Opens the drawer straight onto one chat, e.g. a project's. */
  openChannel: (id: string) => void
  unread: number
} | null>(null)

/** Lets any page open the chat drawer on a given chat (the project page uses it). */
export function useChat() {
  return useContext(ChatContext)
}

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

/** One message as the thread shows it. */
type Line = {
  id: string
  senderId: string
  sender: string
  mine: boolean
  at: string
  text: string
  card?: TaskCard
  mentions?: string[]
}
type View = "list" | "thread" | "new-group" | "members"

/** What a message needs to be sent: its words, who is tagged, and a task card if it carries one. */
type Outgoing = { text: string; mentions?: string[]; card?: TaskCard }

const time = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" })

const clock = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })

const first = (name: string) => name.split(" ")[0]

const message = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback)

/**
 * Team chat, laid out like pigeonholes: Announcements for everyone, team groups,
 * and direct messages. The server keeps messages encrypted and only shows a chat
 * to its members; it is not end-to-end, and the drawer says so.
 */
export function ChatProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false)
  const [view, setView] = useState<View>("list")
  const [unread, setUnread] = useState(0)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [syncProblem, setSyncProblem] = useState<{ message: string; lastOk: Date | null } | null>(null)
  const [directory, setDirectory] = useState<ChatDirectory | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [state, setState] = useState<ChannelState | null>(null)
  const [lines, setLines] = useState<Line[]>([])

  const activeRef = useRef<string | null>(null)
  const busy = useRef(false)
  const lastOk = useRef<Date | null>(null)

  useEffect(() => {
    activeRef.current = activeId
  }, [activeId])

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
  // A failed check keeps the last count rather than showing a false zero.
  useEffect(() => {
    if (isOpen) return
    let stop = false
    const check = async () => {
      try {
        const r = await loadChannels()
        if (!stop) setUnread(r.channels.reduce((n, c) => n + c.unread, 0))
      } catch {
        // Offline: keep the last count; the drawer explains when opened.
      }
    }
    void check()
    const t = setInterval(check, 30_000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [isOpen, userId])

  /** The list of chats. */
  const loadDirectory = useCallback(async () => {
    const r = await loadChannels()
    setDirectory(r)
    setUnread(r.channels.reduce((n, c) => n + c.unread, 0))
    return r
  }, [])

  /** One chat: its members and messages. */
  const refreshThread = useCallback(
    async (id: string): Promise<ChannelState | null> => {
      const r = await loadChannel(id)
      if (!r.ok) throw new Error(r.message)
      const s = r.state
      const names = new Map(s.people.map((p) => [p.id, first(p.name)]))
      const opened: Line[] = s.messages.map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        sender: names.get(m.sender_id) ?? "Someone",
        mine: m.sender_id === userId,
        at: m.at,
        text: m.text,
        card: m.card,
        mentions: m.mentions,
      }))
      // The person may have moved to another chat while this one loaded.
      if (activeRef.current !== id) return s
      setState(s)
      setLines(opened)
      void markChannelRead(id).catch(() => {
        // Only the unread count depends on this; the next refresh tries again.
      })
      return s
    },
    [userId],
  )

  /** One refresh, never two at once, with any failure shown rather than swallowed. */
  const tick = useCallback(
    async (initial: boolean) => {
      if (busy.current) return
      busy.current = true
      try {
        await loadDirectory()
        const id = activeRef.current
        if (id) await refreshThread(id)
        setSetupError(null)
        lastOk.current = new Date()
        setSyncProblem(null)
      } catch (e) {
        const text = message(e, "Chat could not be reached")
        if (/That chat is not here/.test(text) && activeRef.current) {
          toast.error("You are no longer in that chat")
          setActiveId(null)
          setState(null)
          setView("list")
        } else if (initial && !lastOk.current) {
          setSetupError(text)
        } else {
          setSyncProblem({ message: text, lastOk: lastOk.current })
        }
      } finally {
        busy.current = false
      }
    },
    [loadDirectory, refreshThread],
  )

  // While open: refresh at once, then every 4 seconds in a chat and every 5 on the list.
  useEffect(() => {
    if (!isOpen) return
    const now = setTimeout(() => void tick(true), 0)
    const t = setInterval(() => void tick(false), activeId && view !== "list" ? 4_000 : 5_000)
    return () => {
      clearTimeout(now)
      clearInterval(t)
    }
  }, [isOpen, activeId, view, tick])

  const openChat = (id: string) => {
    setState(null)
    setLines([])
    activeRef.current = id
    setActiveId(id)
    setView("thread")
  }

  const backToList = () => {
    activeRef.current = null
    setActiveId(null)
    setState(null)
    setView("list")
    void tick(false)
  }

  const send = async (body: Outgoing) => {
    const id = activeRef.current
    if (!id) throw new Error("Open a chat first")
    const r = await postMessage(id, body)
    if (!r.ok) throw new Error(r.message)
    // Sent. Refreshing is a nicety; a failure here must not look like the send failed.
    void refreshThread(id).catch(() => {})
  }

  const title =
    view === "new-group"
      ? "New group"
      : view === "members"
        ? "People in this group"
        : view === "thread"
          ? (state?.channel.name ?? "Opening")
          : "Team chat"

  return (
    <ChatContext.Provider
      value={{
        open: () => setOpen(true),
        openChannel: (id) => {
          openChat(id)
          setOpen(true)
        },
        unread,
      }}
    >
      {children}
      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-border border-b">
            <div className="flex items-center gap-1">
              {view !== "list" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="-ml-2 size-11"
                  aria-label={view === "members" ? "Back to the chat" : "Back to all chats"}
                  onClick={() => (view === "members" ? setView("thread") : backToList())}
                >
                  <ChevronLeft />
                </Button>
              )}
              <SheetTitle className="min-w-0 flex-1 truncate">{title}</SheetTitle>
              {view === "thread" && state?.channel.kind === "group" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mr-6"
                  onClick={() => setView("members")}
                  aria-label={`People in this group: ${state.members.length}`}
                >
                  <Users /> {state.members.length}
                </Button>
              )}
            </div>
            <SheetDescription className="flex items-center gap-1.5">
              <Lock className="size-3.5 shrink-0" />
              {lockLine(view, state)}
            </SheetDescription>
            {syncProblem && (
              <p className="text-warn text-xs" role="status">
                Warning: not updating ({syncProblem.message}).
                {syncProblem.lastOk ? ` Last checked ${clock(syncProblem.lastOk)}.` : ""}
              </p>
            )}
          </SheetHeader>

          {setupError && !directory && (
            <p className="text-destructive px-4 py-8 text-sm" role="alert">
              Error: {setupError}
            </p>
          )}
          {!setupError && !directory && (
            <p className="text-muted-foreground flex items-center gap-2 px-4 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" /> Opening chat
            </p>
          )}

          {directory && view === "list" && (
            <Pigeonholes
              directory={directory}
              onOpen={openChat}
              onNewGroup={() => setView("new-group")}
              onMessage={async (personId) => {
                try {
                  const r = await startDirectMessage(personId)
                  if (r.ok && r.id) openChat(r.id)
                  else toast.error(r.message)
                } catch (e) {
                  toast.error(message(e, "That conversation could not be opened"))
                }
              }}
            />
          )}

          {view === "thread" && (
            <Thread
              state={state}
              lines={lines}
              onSend={send}
              canEdit={directory?.canEdit ?? false}
              me={{ id: userId, name: state?.people.find((p) => p.id === userId)?.name ?? "You" }}
              people={directory?.people ?? []}
            />
          )}

          {view === "new-group" && directory && (
            <NewGroup
              people={directory.people}
              onCreated={(id) => {
                openChat(id)
                void tick(false)
              }}
            />
          )}

          {view === "members" && state && directory && (
            <GroupMembers
              state={state}
              userId={userId}
              people={directory.people}
              onChanged={() => void tick(false)}
              onLeft={backToList}
            />
          )}
        </SheetContent>
      </Sheet>
    </ChatContext.Provider>
  )
}

function lockLine(view: View, state: ChannelState | null) {
  if (view === "list" || view === "new-group" || !state) return "Private to the people in each chat. Stored encrypted."
  const n = state.members.length
  if (state.channel.kind === "dm") return `Private to you and ${first(state.channel.name)}. Stored encrypted.`
  if (state.channel.kind === "announcements") return `Everyone in this workspace (${n}) can read it. Stored encrypted.`
  return `Private to the ${n} ${n === 1 ? "person" : "people"} in this group. Stored encrypted.`
}

/* --------------------------------------------------------- pigeonholes */

function Pigeonholes({
  directory,
  onOpen,
  onNewGroup,
  onMessage,
}: {
  directory: ChatDirectory
  onOpen: (id: string) => void
  onNewGroup: () => void
  onMessage: (personId: string) => Promise<void>
}) {
  const byRecent = (a: { lastAt: string; name: string }, b: { lastAt: string; name: string }) =>
    b.lastAt.localeCompare(a.lastAt) || a.name.localeCompare(b.name)
  const announcements = directory.channels.filter((c) => c.kind === "announcements")
  const groups = directory.channels.filter((c) => c.kind === "group").sort(byRecent)
  const dms = new Map(directory.channels.filter((c) => c.kind === "dm").map((c) => [c.with, c]))
  const people = [...directory.people].sort(
    (a, b) => (dms.get(b.id)?.lastAt ?? "").localeCompare(dms.get(a.id)?.lastAt ?? "") || a.name.localeCompare(b.name),
  )

  return (
    <div className="flex-1 overflow-y-auto pb-4">
      <Section title="Announcements">
        {announcements.map((c) => (
          <Row key={c.id} icon={Megaphone} label={c.name} hint="Everyone reads · owners and admins post" unread={c.unread} onClick={() => onOpen(c.id)} />
        ))}
      </Section>

      <Section
        title="Groups"
        action={
          directory.canCreateGroup && (
            <Button variant="ghost" size="sm" onClick={onNewGroup}>
              <Plus /> New group
            </Button>
          )
        }
      >
        {groups.length === 0 ? (
          <p className="text-muted-foreground px-4 py-2 text-sm">
            No groups yet.{directory.canCreateGroup ? " Start one for a team or a piece of work." : ""}
          </p>
        ) : (
          groups.map((c) => <Row key={c.id} icon={Users} label={c.name} unread={c.unread} onClick={() => onOpen(c.id)} />)
        )}
      </Section>

      <Section title="Direct messages">
        {people.length === 0 ? (
          <p className="text-muted-foreground px-4 py-2 text-sm">Nobody else is in this workspace yet.</p>
        ) : (
          people.map((p) => {
            const dm = dms.get(p.id)
            return (
              <Row
                key={p.id}
                icon={UserRound}
                label={p.name}
                hint={dm?.lastAt ? undefined : "Start a conversation"}
                unread={dm?.unread ?? 0}
                onClick={() => (dm ? onOpen(dm.id) : void onMessage(p.id))}
              />
            )
          })
        )}
      </Section>

      <details className="group mx-4 mt-4">
        <summary className="text-muted-foreground focus-visible:ring-ring flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md text-xs font-semibold tracking-wide uppercase focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
          About chat privacy
        </summary>
        <p className="text-muted-foreground pb-2 text-xs leading-relaxed">
          Only the people in a chat can open it in the app. Owners and admins cannot open chats they are not in. Messages
          are stored encrypted. They are not end-to-end encrypted: the app has to read them to show them to you, so
          whoever runs this app&rsquo;s hosting could in principle read them too. Keep anything that must never leave the
          room out of chat.
        </p>
      </details>
    </div>
  )
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-3" aria-label={title}>
      <div className="flex min-h-9 items-center justify-between px-4">
        <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{title}</h3>
        {action}
      </div>
      <div className="flex flex-col">{children}</div>
    </section>
  )
}

function Row({
  icon: Icon,
  label,
  hint,
  unread,
  onClick,
}: {
  icon: typeof Users
  label: string
  hint?: string
  unread: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-muted/60 focus-visible:ring-ring flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <span className="bg-accent text-accent-foreground grid size-8 shrink-0 place-items-center rounded-full">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-sm", unread > 0 && "font-semibold")}>{label}</span>
        {hint && <span className="text-muted-foreground block truncate text-xs">{hint}</span>}
      </span>
      {unread > 0 && (
        <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums">
          {unread}
          <span className="sr-only"> unread</span>
        </span>
      )}
      <ChevronRight className="text-muted-foreground size-4" />
    </button>
  )
}

/* -------------------------------------------------------------- thread */

function Thread({
  state,
  lines,
  onSend,
  canEdit,
  me,
  people,
}: {
  state: ChannelState | null
  lines: Line[]
  onSend: (body: Outgoing) => Promise<void>
  /** May turn messages into tasks, record notes and flags. */
  canEdit: boolean
  me: { id: string; name: string }
  people: { id: string; name: string }[]
}) {
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" })
  }, [lines.length])

  const send = async () => {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setSendError(null)
    try {
      // Who is tagged is worked out here and checked again by the server.
      const mentions = parseMentions(text, others).filter((id) => id !== me.id)
      await onSend(mentions.length > 0 ? { text, mentions } : { text })
      setDraft("")
    } catch (e) {
      setSendError(message(e, "That did not send"))
    } finally {
      setSending(false)
    }
  }

  // People who can be tagged here: everyone in this chat but you.
  const others = (state?.members ?? []).filter((m) => m.id !== me.id)
  const tag = openTag(draft)
  const matches = tag && others.length > 0 ? matchTag(tag.query, others) : []

  const name = state?.channel.name ?? ""

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-3" aria-live="polite">
        {!state && (
          <p className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
            <Loader2 className="size-4 animate-spin" /> Opening the chat
          </p>
        )}
        {state && state.unreadable > 0 && (
          <p className="text-destructive mb-3 text-sm" role="alert">
            Error: {state.unreadable === 1 ? "1 message" : `${state.unreadable} messages`} could not be opened. They may
            have been changed or damaged. Tell an owner if this stays.
          </p>
        )}
        {state?.truncated && <p className="text-muted-foreground mb-3 text-xs">Only the latest 200 messages are shown here.</p>}
        {state && lines.length === 0 && (
          <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-10 text-center text-sm">
            {state.channel.kind === "dm"
              ? `No messages yet. Say hello to ${first(state.channel.name)}.`
              : state.channel.kind === "announcements"
                ? "No announcements yet."
                : "No messages yet. Say hello to the group."}
          </p>
        )}
        <ol className="flex flex-col gap-3">
          {lines.map((l) => (
              <li key={l.id} className="flex items-start gap-1">
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-xs">
                    <span className="text-foreground font-semibold">{l.mine ? "You" : l.sender}</span> · {time(l.at)}
                  </p>
                  {l.card ? <TaskCardView card={l.card} /> : <p className="text-sm leading-snug whitespace-pre-wrap">{l.text}</p>}
                  {l.mine && !l.card && canEdit && state && l.mentions?.[0] && (
                    <TaskSuggestion
                      message={{ id: l.id, text: l.text, senderId: l.senderId, senderName: l.sender, mine: l.mine, at: l.at }}
                      taggedId={l.mentions[0]}
                      me={me}
                      people={people}
                      onTaskMade={async (card) => {
                        if (!state.canPost) return
                        await onSend({ text: `New task for ${card.assignee}: ${card.title}`, card })
                      }}
                    />
                  )}
                </div>
                {canEdit && state && !l.card && (
                  <MessageActions
                    message={{ text: l.text, senderId: l.senderId, senderName: l.sender, mine: l.mine, at: l.at }}
                    chatName={state.channel.name}
                    me={me}
                    people={people}
                    onTaskMade={async (card) => {
                      // Someone who cannot post here (Announcements) still gets the task, just no card.
                      if (!state.canPost) return
                      await onSend({ text: `New task for ${card.assignee}: ${card.title}`, card })
                    }}
                  />
                )}
              </li>
            ))}
        </ol>
        <div ref={bottom} />
      </div>

      {state && !state.canPost ? (
        <p className="border-border text-muted-foreground border-t px-4 py-4 text-sm">
          {state.closedProject
            ? "This project is closed, so its chat is kept to read. Reopen the project to write here again."
            : "Only owners and admins post announcements. Reply to them in a direct message."}
        </p>
      ) : (
        <form
          className="border-border flex items-end gap-2 border-t p-3"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <div className="flex-1">
            {sendError && (
              <p className="text-destructive mb-1.5 text-xs" role="alert">
                Error: {sendError}
              </p>
            )}
            {matches.length > 0 && tag && (
              <ul
                aria-label="People you can tag"
                className="bg-popover border-border mb-1.5 flex flex-col overflow-hidden rounded-lg border shadow-sm"
              >
                {matches.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="hover:bg-muted focus-visible:ring-ring flex min-h-11 w-full items-center px-3 text-left text-sm focus-visible:ring-2 focus-visible:outline-none"
                      onClick={() => setDraft(draft.slice(0, tag.start) + "@" + handleFor(p, others) + " ")}
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <label htmlFor="chat-draft" className="sr-only">
              Message {name}
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
              placeholder={`Message ${name}`}
              rows={1}
              maxLength={4000}
              disabled={!state}
              className="max-h-40 min-h-11 resize-none"
            />
          </div>
          <Button type="submit" size="icon" className="size-11" disabled={sending || !draft.trim() || !state} aria-label="Send">
            {sending ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </form>
      )}
    </>
  )
}

/* ---------------------------------------------------------------- groups */

function PeoplePicker({
  people,
  chosen,
  onChange,
}: {
  people: { id: string; name: string }[]
  chosen: string[]
  onChange: (ids: string[]) => void
}) {
  return (
    <ul className="flex flex-col">
      {people.map((p) => {
        const on = chosen.includes(p.id)
        return (
          <li key={p.id}>
            <label className="hover:bg-muted/60 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm">
              <Checkbox
                checked={on}
                onCheckedChange={(v) => onChange(v ? [...chosen, p.id] : chosen.filter((x) => x !== p.id))}
              />
              {p.name}
            </label>
          </li>
        )
      })}
    </ul>
  )
}

function NewGroup({ people, onCreated }: { people: { id: string; name: string }[]; onCreated: (id: string) => void }) {
  const [name, setName] = useState("")
  const [chosen, setChosen] = useState<string[]>([])
  const [pending, setPending] = useState(false)

  return (
    <form
      className="flex flex-1 flex-col overflow-y-auto"
      onSubmit={async (e) => {
        e.preventDefault()
        if (pending) return
        setPending(true)
        try {
          const r = await createGroup(name, chosen)
          if (r.ok && r.id) {
            toast.success(r.message)
            onCreated(r.id)
          } else toast.error(r.message)
        } catch (err) {
          toast.error(message(err, "The group could not be started. Check your list before trying again."))
        } finally {
          setPending(false)
        }
      }}
    >
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="group-name" className="text-sm font-medium">
            Group name
          </label>
          <Input
            id="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. PPE logistics"
            maxLength={40}
            className="h-11"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">Who is in it</p>
          <p className="text-muted-foreground text-xs">You are in it too. Anyone in the group can add more people later.</p>
          <PeoplePicker people={people} chosen={chosen} onChange={setChosen} />
        </div>
      </div>
      <div className="border-border mt-auto border-t p-3">
        <Button type="submit" className="h-11 w-full" disabled={pending || name.trim().length < 2 || chosen.length === 0}>
          {pending && <Loader2 className="animate-spin" />} Start group
        </Button>
      </div>
    </form>
  )
}

function GroupMembers({
  state,
  userId,
  people,
  onChanged,
  onLeft,
}: {
  state: ChannelState
  userId: string
  people: { id: string; name: string }[]
  onChanged: () => void
  onLeft: () => void
}) {
  const [adding, setAdding] = useState<string[]>([])
  const [pending, setPending] = useState(false)
  const inGroup = new Set(state.members.map((m) => m.id))
  const outside = people.filter((p) => !inGroup.has(p.id))

  const run = async (fn: () => Promise<{ ok: boolean; message: string }>, after?: () => void) => {
    setPending(true)
    try {
      const r = await fn()
      if (r.ok) {
        toast.success(r.message)
        after?.()
      } else toast.error(r.message)
    } catch (e) {
      toast.error(message(e, "That did not go through"))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <ul className="divide-border divide-y">
        {state.members.map((m) => (
          <li key={m.id} className="flex min-h-12 items-center gap-3 px-4 py-1.5">
            <span className="min-w-0 flex-1 truncate text-sm">
              {m.id === userId ? "You" : m.name}
              {m.id === state.channel.createdBy && <span className="text-muted-foreground"> · started the group</span>}
            </span>
            {m.id === userId ? (
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => removeGroupMember(state.channel.id, userId), onLeft)}>
                Leave
              </Button>
            ) : (
              state.canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => removeGroupMember(state.channel.id, m.id), onChanged)}
                >
                  Remove
                </Button>
              )
            )}
          </li>
        ))}
      </ul>

      {outside.length > 0 && (
        <div className="border-border flex flex-col gap-2 border-t p-4">
          <p className="text-sm font-medium">Add people</p>
          <p className="text-muted-foreground text-xs">They will be able to read the messages already in the group.</p>
          <PeoplePicker people={outside} chosen={adding} onChange={setAdding} />
          <Button
            className="h-11"
            disabled={pending || adding.length === 0}
            onClick={() =>
              run(
                () => addGroupMembers(state.channel.id, adding),
                () => {
                  setAdding([])
                  onChanged()
                },
              )
            }
          >
            {pending && <Loader2 className="animate-spin" />} Add to group
          </Button>
        </div>
      )}
    </div>
  )
}

/** A task made from a message, as a card in the chat that links to where the task lives. */
function TaskCardView({ card }: { card: TaskCard }) {
  return (
    <Link
      href={card.href}
      className="bg-card border-border hover:bg-muted/60 mt-1.5 flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors duration-150"
    >
      <ClipboardList className="text-primary size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{card.title}</span>
        <span className="text-muted-foreground block text-xs">Task for {card.assignee} · open it</span>
      </span>
      <ChevronRight className="text-muted-foreground size-4" aria-hidden />
    </Link>
  )
}
