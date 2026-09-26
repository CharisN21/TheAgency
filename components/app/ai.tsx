"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Bot, Check, Loader2, Sparkles, UserRound, X } from "lucide-react"
import { toast } from "sonner"

import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { decideSuggestion, suggestTeam } from "@/lib/data/actions"
import type { TeamSuggestion } from "@/lib/data/types"

/** Shown instead of a Claude button when no API key is set. */
export function ClaudeOff({ what }: { what: string }) {
  return (
    <p className="text-muted-foreground flex items-start gap-2 text-xs">
      <Sparkles className="mt-0.5 size-3.5 shrink-0" />
      Claude can {what} once an API key is added to .env.local. Everything else works without it.
    </p>
  )
}

/** Asks Claude for a team structure. The answer appears as lines to accept or dismiss. */
export function SuggestTeamButton({ projectId, again }: { projectId: string; again: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await suggestTeam(projectId)
          if (result.ok) {
            toast.success(result.message)
            router.refresh()
          } else {
            toast.error(result.message)
          }
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
      {pending ? "Asking Claude…" : again ? "Ask again" : "Suggest a team"}
    </Button>
  )
}

function Decide({
  suggestionId,
  lineKey,
  state,
}: {
  suggestionId: string
  lineKey: string
  state?: "accepted" | "dismissed"
}) {
  const [pending, start] = useTransition()
  const run = (decision: "accept" | "dismiss") =>
    start(async () => {
      const result = await decideSuggestion(suggestionId, lineKey, decision)
      if (!result.ok) toast.error(result.message)
      else if (result.message) toast.success(result.message)
    })

  if (state) {
    return (
      <span
        className={cn(
          "text-xs font-medium",
          state === "accepted" ? "text-ok" : "text-muted-foreground",
        )}
      >
        {state === "accepted" ? "Accepted" : "Dismissed"}
      </span>
    )
  }
  return (
    <span className="flex shrink-0 gap-1">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run("accept")}>
        {pending ? <Loader2 className="animate-spin" /> : <Check />} Accept
      </Button>
      <Button
        size="icon"
        variant="ghost"
        disabled={pending}
        onClick={() => run("dismiss")}
        aria-label="Dismiss"
      >
        <X />
      </Button>
    </span>
  )
}

/**
 * Claude's proposal, one line at a time. Accepting a named person adds them to
 * the project; accepting a milestone adds a task for the lead. Nothing else
 * happens, and nothing happens without a click.
 */
export function TeamSuggestionList({
  suggestion,
  names,
  canDecide,
}: {
  suggestion: TeamSuggestion
  names: Record<string, string>
  canDecide: boolean
}) {
  const state = (key: string) =>
    suggestion.accepted.includes(key)
      ? "accepted"
      : suggestion.dismissed.includes(key)
        ? "dismissed"
        : undefined
  const when = new Date(suggestion.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-xs">
        Suggested by Claude on {when}. Suggestions only: nobody is added and nothing is created
        until you accept a line.
      </p>

      <ul className="bg-card divide-border divide-y rounded-xl border">
        {suggestion.roles.map((r, i) => {
          const key = `role:${i}`
          return (
            <li key={key} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {r.role}
                  {r.headcount > 1 && (
                    <span className="text-muted-foreground font-normal">
                      · {r.headcount} people
                    </span>
                  )}
                  <span
                    className={cn(
                      "inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-medium",
                      r.kind === "ai" ? "bg-info-soft text-info" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {r.kind === "ai" ? (
                      <Bot className="size-3" />
                    ) : (
                      <UserRound className="size-3" />
                    )}
                    {r.kind === "ai" ? "AI helper" : "Person"}
                  </span>
                </span>
                <span className="text-muted-foreground block text-xs">
                  {r.why}
                  {r.suggested_member_id && names[r.suggested_member_id]
                    ? ` Suggested: ${names[r.suggested_member_id]}.`
                    : ""}
                </span>
              </span>
              {canDecide ? (
                <Decide suggestionId={suggestion.id} lineKey={key} state={state(key)} />
              ) : null}
            </li>
          )
        })}
      </ul>

      {suggestion.milestones.length > 0 && (
        <>
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Milestones
          </p>
          <ul className="bg-card divide-border divide-y rounded-xl border">
            {suggestion.milestones.map((m, i) => {
              const key = `milestone:${i}`
              const due = new Date(
                new Date(suggestion.created_at).getTime() + m.due_in_days * 864e5,
              )
              return (
                <li key={key} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{m.title}</span>
                    <span className="text-muted-foreground block text-xs">
                      By {due.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </span>
                  {canDecide ? (
                    <Decide suggestionId={suggestion.id} lineKey={key} state={state(key)} />
                  ) : null}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
