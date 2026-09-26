import "server-only"

import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"

/**
 * The one door to Claude. Server-side only: the key lives in .env.local and
 * never reaches the browser. Everything Claude returns is a suggestion that a
 * person accepts line by line; nothing here writes to the data.
 */

const MODEL = "claude-opus-5"

/** Claude is switched on when .env.local has an API key. */
export function aiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

let client: Anthropic | null = null
const getClient = () => (client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))

export type AiResult<T> = { ok: true; data: T } | { ok: false; message: string }

const SYSTEM = `You help the owner of a small Kenyan business run projects with their team.
You suggest; people decide. Every suggestion will be shown to a person who accepts or rejects it line by line, so keep each line short, concrete and self-contained.
Write in plain British English, sentence case, no jargon, no emoji. Money is in Kenyan shillings, written KSh 480,000.
Only use the facts you are given. If something is not in them, do not invent it.`

/**
 * Asks Claude for an answer shaped by `schema`, and checks the shape before
 * returning it. Uses a structured JSON output, adaptive thinking, and the
 * server-side refusal fallback.
 */
export async function askForJson<T>(
  schema: z.ZodType<T>,
  task: string,
  facts: unknown,
): Promise<AiResult<T>> {
  if (!aiAvailable()) {
    return { ok: false, message: "Claude is not switched on. Add an API key to .env.local first." }
  }

  // The API wants the schema itself, without the "$schema" dialect marker.
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>
  delete jsonSchema.$schema

  try {
    const response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: { type: "json_schema", schema: jsonSchema } },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `${task}\n\nThe facts, as JSON:\n${JSON.stringify(facts, null, 2)}`,
        },
      ],
    })

    if (response.stop_reason === "refusal") {
      return { ok: false, message: "Claude declined this one. Carry on without it." }
    }
    if (response.stop_reason === "max_tokens") {
      return { ok: false, message: "Claude's answer was cut short. Try again." }
    }

    const text = response.content.find((b) => b.type === "text")
    if (!text || text.type !== "text")
      return { ok: false, message: "Claude sent nothing back. Try again." }

    const parsed = schema.safeParse(JSON.parse(text.text))
    if (!parsed.success)
      return { ok: false, message: "Claude's answer was not in the expected shape. Try again." }
    return { ok: true, data: parsed.data }
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, message: "Claude did not accept the API key. Check it in .env.local." }
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, message: "Claude is busy. Try again in a minute." }
    }
    if (error instanceof Anthropic.APIError) {
      return { ok: false, message: `Claude could not answer (error ${error.status}). Try again.` }
    }
    if (error instanceof SyntaxError) {
      return { ok: false, message: "Claude's answer could not be read. Try again." }
    }
    return { ok: false, message: "Could not reach Claude. Check the internet connection." }
  }
}
