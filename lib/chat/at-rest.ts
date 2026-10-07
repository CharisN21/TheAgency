import "server-only"

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

import type { TaskCard } from "./card"

/**
 * Chat messages are stored encrypted, with a key the server holds. A leaked
 * database or backup alone shows nothing readable. This is not end-to-end:
 * the app's server can read messages in order to show them to the members of
 * a chat, and so can whoever runs it.
 *
 * Each message is sealed with a key made for its workspace, and tied to its
 * chat and sender, so a stored message copied into another chat, another
 * workspace or under another sender fails to open.
 *
 * The master key is CHAT_ENCRYPTION_KEY (32 random bytes, base64) and lives in
 * the server's environment, never in the database or the browser. On a laptop
 * without one, a key file is made once in the git-ignored data folder; a
 * production server without the variable refuses to start sending messages.
 */

export type ChatBody = {
  text: string
  /** Ids of people tagged in the message. */
  mentions?: string[]
  /** A task made from the message, shown as a card that links to it. */
  card?: TaskCard
}

export type Where = { workspaceId: string; channelId: string; senderId: string }

let master: Buffer | null = null

function masterKey(): Buffer {
  if (master) return master
  const fromEnv = process.env.CHAT_ENCRYPTION_KEY
  if (fromEnv) {
    const key = Buffer.from(fromEnv, "base64")
    if (key.length !== 32) throw new Error("CHAT_ENCRYPTION_KEY must be 32 random bytes, base64 encoded")
    return (master = key)
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("CHAT_ENCRYPTION_KEY is not set, so chat cannot store messages")
  }
  const dir = process.env.AGENCY_DATA_DIR ?? path.join(process.cwd(), ".data")
  const file = path.join(dir, "chat.key")
  if (!existsSync(file)) {
    mkdirSync(dir, { recursive: true })
    writeFileSync(file, randomBytes(32).toString("base64"), "utf8")
  }
  return (master = Buffer.from(readFileSync(file, "utf8").trim(), "base64"))
}

const workspaceKey = (workspaceId: string) =>
  Buffer.from(hkdfSync("sha256", masterKey(), Buffer.from(workspaceId), Buffer.from("the-agency/chat/v1"), 32))

const aad = (w: Where) => Buffer.from(`${w.workspaceId}|${w.channelId}|${w.senderId}`)

/** Seals a message body for storage: base64 of iv, tag and ciphertext. */
export function sealBody(body: ChatBody, where: Where): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", workspaceKey(where.workspaceId), iv)
  cipher.setAAD(aad(where))
  const ct = Buffer.concat([cipher.update(JSON.stringify(body), "utf8"), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64")
}

/** Opens a stored message, or returns null if it was changed, moved or sealed with another key. */
export function openBody(stored: string, where: Where): ChatBody | null {
  try {
    const raw = Buffer.from(stored, "base64")
    if (raw.length < 12 + 16 + 1) return null
    const decipher = createDecipheriv("aes-256-gcm", workspaceKey(where.workspaceId), raw.subarray(0, 12))
    decipher.setAAD(aad(where))
    decipher.setAuthTag(raw.subarray(12, 28))
    const plain = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8")
    const body = JSON.parse(plain) as ChatBody
    return typeof body?.text === "string" ? body : null
  } catch {
    return null
  }
}
