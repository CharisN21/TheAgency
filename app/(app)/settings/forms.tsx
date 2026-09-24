"use client"

import { useState, useTransition } from "react"
import { Check, Loader2, RotateCcw } from "lucide-react"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { resetDemoData, updateWorkspace } from "@/lib/data/actions"

export function WorkspaceNameForm({ name }: { name: string }) {
  const [pending, start] = useTransition()
  const [saved, setSaved] = useState(false)
  const [value, setValue] = useState(name)

  function submit(formData: FormData) {
    start(async () => {
      const result = await updateWorkspace(formData)
      if (result.ok) {
        setSaved(true)
        toast.success(result.message)
        setTimeout(() => setSaved(false), 2000)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <form action={submit} className="flex flex-col gap-2">
      <Label htmlFor="workspace-name">Name</Label>
      <div className="flex gap-2">
        <Input
          id="workspace-name"
          name="name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="max-w-xs"
          required
        />
        <Button type="submit" variant="outline" disabled={pending || value === name}>
          {pending && <Loader2 className="animate-spin" />}
          {saved && <Check />}
          {saved ? "Saved" : "Save"}
        </Button>
      </div>
    </form>
  )
}

export function ResetDemo() {
  const [pending, start] = useTransition()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="self-start">
          <RotateCcw /> Reset demo data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Start again with the demo data?</AlertDialogTitle>
          <AlertDialogDescription>
            Every workspace, person and invite you created locally is replaced with the
            original demo set, and you are signed out. Nothing outside this laptop is
            touched.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault()
              start(async () => {
                const result = await resetDemoData()
                toast.success(result.message)
                location.href = "/sign-in"
              })
            }}
          >
            {pending && <Loader2 className="animate-spin" />}
            Reset
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
