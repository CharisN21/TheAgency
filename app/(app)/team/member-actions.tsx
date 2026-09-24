"use client"

import { useState, useTransition } from "react"
import { Loader2, MoreHorizontal, Trash2, UserCog, X } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { changeRole, removeMember, revokeInvite } from "@/lib/data/actions"
import { ROLE_LABEL, ROLES, type Role } from "@/lib/data/types"

export function MemberActions({
  userId,
  name,
  role,
  companyName,
  isSelf,
}: {
  userId: string
  name: string
  role: Role
  companyName: string
  isSelf: boolean
}) {
  const [pending, start] = useTransition()
  const [confirm, setConfirm] = useState(false)

  function setRole(next: string) {
    if (next === role) return
    start(async () => {
      const result = await changeRole(userId, next as Role)
      result.ok ? toast.success(result.message) : toast.error(result.message)
    })
  }

  function remove() {
    start(async () => {
      const result = await removeMember(userId)
      setConfirm(false)
      result.ok ? toast.success(result.message) : toast.error(result.message)
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            aria-label={`Manage ${name}`}
          >
            {pending ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-muted-foreground flex items-center gap-2 text-xs">
            <UserCog className="size-3.5" /> Role in {companyName}
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup value={role} onValueChange={setRole}>
            {ROLES.map((r) => (
              <DropdownMenuRadioItem key={r} value={r}>
                {ROLE_LABEL[r]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirm(true)}>
            <Trash2 /> {isSelf ? "Leave company" : "Remove from company"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isSelf ? `Leave ${companyName}?` : `Remove ${name} from ${companyName}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isSelf
                ? "You will lose access straight away. An owner can invite you back at any time."
                : `${name} loses access straight away. Nothing they created is deleted, and you can invite them again at any time.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                remove()
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {pending ? <Loader2 className="animate-spin" /> : null}
              {isSelf ? "Leave" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function RevokeInvite({ inviteId, email }: { inviteId: string; email: string }) {
  const [pending, start] = useTransition()

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Cancel the invite for ${email}`}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await revokeInvite(inviteId)
          result.ok ? toast.success(result.message) : toast.error(result.message)
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <X />}
    </Button>
  )
}
