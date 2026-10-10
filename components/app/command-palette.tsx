"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  Building2,
  ClipboardList,
  Contact,
  Flag,
  FolderKanban,
  HandCoins,
  Loader2,
  MessageSquare,
  NotebookPen,
  PenLine,
  PenTool,
  Repeat,
  Search,
  SlidersHorizontal,
  Sun,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react"

import { useChat } from "@/components/app/chat"
import { useQuickCapture } from "@/components/app/quick-capture"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { searchEverything, type SearchHit } from "@/lib/data/actions"

const PaletteContext = createContext<{ open: () => void } | null>(null)

/** The search box in the top bar. Opens the palette; Ctrl K does the same from anywhere. */
export function SearchButton() {
  const palette = useContext(PaletteContext)
  if (!palette) return null
  return (
    <>
      <Button variant="ghost" size="icon" className="md:hidden" aria-label="Search and do" title="Search (Ctrl K)" onClick={palette.open}>
        <Search />
      </Button>
      <Button variant="outline" size="sm" className="text-muted-foreground hidden gap-2 md:inline-flex" onClick={palette.open}>
        <Search /> Search
        <kbd className="border-border ml-1 rounded border px-1.5 text-[11px]">Ctrl K</kbd>
      </Button>
    </>
  )
}

const KIND: Record<SearchHit["kind"], { group: string; icon: typeof Search }> = {
  organisation: { group: "Organisations", icon: Building2 },
  person: { group: "People", icon: Contact },
  deal: { group: "Deals", icon: HandCoins },
  project: { group: "Projects", icon: FolderKanban },
  task: { group: "Tasks", icon: ClipboardList },
  member: { group: "Team", icon: UserRound },
  note: { group: "Notes and whiteboards", icon: NotebookPen },
  board: { group: "Notes and whiteboards", icon: PenTool },
}

const PAGES = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/organisations", label: "Organisations", icon: Building2 },
  { href: "/people", label: "People", icon: Contact },
  { href: "/deals", label: "Deals", icon: HandCoins },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/notebook", label: "Notebook", icon: NotebookPen },
  { href: "/team", label: "Team", icon: Users },
  { href: "/flags", label: "Flags", icon: Flag },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: SlidersHorizontal },
]

/**
 * Ctrl K: one box to find anything in this workspace and go there, or to do
 * something (a note, a whiteboard, the chat, switch workspace). Results come
 * from the server, which shows only what you are allowed to open.
 */
export function CommandPaletteProvider({
  workspaces,
  currentId,
  canInvite,
  hidden = [],
  children,
}: {
  workspaces: { id: string; name: string }[]
  currentId: string
  canInvite: boolean
  /** Pages this person may not open (an Observer's closed tabs). */
  hidden?: string[]
  children: React.ReactNode
}) {
  const router = useRouter()
  const chat = useChat()
  const capture = useQuickCapture()
  const [isOpen, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [hits, setHits] = useState<SearchHit[]>([])
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const ticket = useRef(0)

  // Ctrl K (Cmd K on a Mac) opens and closes it from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const q = text.trim()
  useEffect(() => {
    if (!q) return
    const mine = ++ticket.current
    const t = setTimeout(async () => {
      setBusy(true)
      try {
        const r = await searchEverything(q)
        if (mine !== ticket.current) return
        if (r.ok) {
          setHits(r.hits)
          setProblem(null)
        } else setProblem(r.message)
      } catch {
        if (mine === ticket.current) setProblem("Search did not work. Try again.")
      } finally {
        if (mine === ticket.current) setBusy(false)
      }
    }, 150)
    return () => clearTimeout(t)
  }, [q])

  const close = () => {
    setOpen(false)
    setText("")
    setHits([])
    setProblem(null)
  }
  const go = (href: string) => {
    close()
    router.push(href)
  }
  const run = (fn: () => void) => {
    close()
    // Let the palette close before the next window opens.
    setTimeout(fn, 50)
  }

  const matches = (label: string) => !q || label.toLowerCase().includes(q.toLowerCase())
  const actions = [
    { id: "note", label: "New note", hint: "Alt N", icon: PenLine, do: () => run(() => capture?.open()) },
    ...(hidden.includes("/notebook") ? [] : [{ id: "board", label: "New whiteboard", icon: PenTool, do: () => go("/notebook?new=board") }]),
    { id: "chat", label: "Open team chat", hint: "Ctrl J", icon: MessageSquare, do: () => run(() => chat?.open()) },
    ...(canInvite ? [{ id: "invite", label: "Invite someone", icon: UserPlus, do: () => go("/team?invite=1") }] : []),
  ].filter((a) => matches(a.label))
  const pages = PAGES.filter((p) => !hidden.includes(p.href) && (matches(p.label) || matches(`Go to ${p.label}`)))
  const switches = workspaces
    .filter((w) => w.id !== currentId && (matches(w.name) || matches(`Switch to ${w.name}`)))
    .map((w) => ({ ...w, href: `/open?w=${encodeURIComponent(w.id)}&to=%2Ftoday` }))

  const groups = q
    ? Object.entries(
        hits.reduce<Record<string, SearchHit[]>>((acc, h) => {
          ;(acc[KIND[h.kind].group] ??= []).push(h)
          return acc
        }, {})
      )
    : []
  const nothing = q && !busy && hits.length === 0 && actions.length === 0 && pages.length === 0 && switches.length === 0

  return (
    <PaletteContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <Dialog open={isOpen} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent className="top-[12svh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl" showCloseButton={false}>
          <DialogTitle className="sr-only">Search and do</DialogTitle>
          <DialogDescription className="sr-only">
            Find organisations, people, deals, projects, tasks, your team and notes, or start something. Use the arrow keys and Enter.
          </DialogDescription>
          <Command shouldFilter={false} loop>
            <CommandInput value={text} onValueChange={setText} placeholder="Search or type a command" maxLength={100} />
            <CommandList>
              {problem && (
                <p className="text-destructive px-3 py-2 text-sm" role="alert">
                  Error: {problem}
                </p>
              )}
              {busy && hits.length === 0 && (
                <p className="text-muted-foreground flex items-center gap-2 px-3 py-2 text-sm" role="status">
                  <Loader2 className="size-4 animate-spin" /> Searching…
                </p>
              )}
              {nothing && <CommandEmpty>Nothing found for &ldquo;{q}&rdquo;.</CommandEmpty>}

              {groups.map(([label, rows]) => (
                <CommandGroup key={label} heading={label}>
                  {rows.map((h) => {
                    const Icon = KIND[h.kind].icon
                    return (
                      <CommandItem key={`${h.kind}:${h.id}`} value={`${h.kind}:${h.id}`} onSelect={() => go(h.href)}>
                        <Icon className="text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{h.title}</span>
                          {h.hint && <span className="text-muted-foreground block truncate text-xs">{h.hint}</span>}
                        </span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ))}

              {groups.length > 0 && (actions.length > 0 || pages.length > 0) && <CommandSeparator />}

              {actions.length > 0 && (
                <CommandGroup heading="Do">
                  {actions.map((a) => (
                    <CommandItem key={a.id} value={`do:${a.id}`} onSelect={a.do}>
                      <a.icon className="text-muted-foreground" />
                      <span className="flex-1">{a.label}</span>
                      {a.hint && <kbd className="text-muted-foreground border-border rounded border px-1.5 text-[11px]">{a.hint}</kbd>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {pages.length > 0 && (
                <CommandGroup heading="Go to">
                  {pages.map((p) => (
                    <CommandItem key={p.href} value={`page:${p.href}`} onSelect={() => go(p.href)}>
                      <p.icon className="text-muted-foreground" />
                      {p.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {switches.length > 0 && (
                <CommandGroup heading="Switch workspace">
                  {switches.map((w) => (
                    <CommandItem
                      key={w.id}
                      value={`switch:${w.id}`}
                      onSelect={() => {
                        close()
                        // A full load, so the new workspace is read fresh.
                        window.location.assign(w.href)
                      }}
                    >
                      <Repeat className="text-muted-foreground" />
                      Switch to {w.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </PaletteContext.Provider>
  )
}
