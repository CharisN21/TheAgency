"use client"

import { useState } from "react"
import { Loader2, MessageSquare } from "lucide-react"
import { toast } from "sonner"

import { useChat } from "@/components/app/chat"
import { Button } from "@/components/ui/button"
import { startProjectChat } from "@/lib/data/actions"

/**
 * Opens the project's chat in the chat drawer, starting it the first time:
 * a group with the project's lead and members. Nothing is posted by pressing it.
 */
export function ProjectChatButton({ projectId }: { projectId: string }) {
  const chat = useChat()
  const [pending, setPending] = useState(false)
  if (!chat) return null

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={async () => {
        setPending(true)
        try {
          const r = await startProjectChat(projectId)
          if (r.ok && r.id) {
            if (r.message) toast.success(r.message)
            chat.openChannel(r.id)
          } else toast.error(r.message)
        } catch {
          toast.error("The project chat could not be opened. Try again.")
        } finally {
          setPending(false)
        }
      }}
    >
      {pending ? <Loader2 className="animate-spin" /> : <MessageSquare />} Project chat
    </Button>
  )
}
