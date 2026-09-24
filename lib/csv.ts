/**
 * A small CSV reader. Runs in the browser, so the file never leaves the laptop
 * until the person presses Import — and then only the rows they mapped.
 *
 * Handles what real spreadsheets produce: quoted fields, commas and newlines
 * inside quotes, doubled quotes, CRLF, a UTF-8 BOM, and semicolon files from
 * Excel in some locales.
 */

export type Sheet = { headers: string[]; rows: string[][] }

export function parseCsv(input: string): Sheet {
  const text = input.replace(/^﻿/, "")
  const delimiter = pickDelimiter(text)
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]

    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        field += c
      }
      continue
    }

    if (c === '"') {
      quoted = true
    } else if (c === delimiter) {
      row.push(field.trim())
      field = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(field.trim())
      field = ""
      if (row.some((f) => f !== "")) rows.push(row)
      row = []
    } else {
      field += c
    }
  }

  row.push(field.trim())
  if (row.some((f) => f !== "")) rows.push(row)

  const [headers = [], ...body] = rows
  return {
    headers: headers.map((h, i) => h || `Column ${i + 1}`),
    // Pad short rows so every row lines up with the headers.
    rows: body.map((r) => headers.map((_, i) => r[i] ?? "")),
  }
}

function pickDelimiter(text: string): string {
  const firstLine = text.slice(0, text.indexOf("\n") + 1 || text.length)
  const counts = [",", ";", "\t"].map((d) => ({
    d,
    n: firstLine.split(d).length - 1,
  }))
  return counts.sort((a, b) => b.n - a.n)[0].n > 0
    ? counts.sort((a, b) => b.n - a.n)[0].d
    : ","
}

/* ------------------------------------------------------- column guessing */

export type TargetField =
  | "skip"
  | "name"
  | "category"
  | "what_they_do"
  | "location"
  | "phone"
  | "email"
  | "tags"
  | "contact_name"
  | "contact_title"
  | "contact_phone"
  | "contact_email"

export const TARGET_LABEL: Record<TargetField, string> = {
  skip: "Don't import",
  name: "Organisation name",
  category: "Type (supplier, client…)",
  what_they_do: "What they do",
  location: "Where they are",
  phone: "Organisation phone",
  email: "Organisation email",
  tags: "Tags",
  contact_name: "Person · name",
  contact_title: "Person · role",
  contact_phone: "Person · phone",
  contact_email: "Person · email",
}

const HINTS: [TargetField, RegExp][] = [
  ["contact_name", /^(contact|person|attention|attn)([ _-]?(name|person))?$/i],
  ["contact_title", /(position|role|designation|job ?title)/i],
  ["contact_email", /(contact|person)[ _-]?e-?mail/i],
  ["contact_phone", /(contact|person|mobile|cell)[ _-]?(phone|no|number|tel)?/i],
  ["name", /^(supplier|company|organisation|organization|business|client|vendor|firm)([ _-]?name)?$/i],
  ["name", /^name$/i],
  ["category", /^(type|category|relationship|kind)$/i],
  ["what_they_do", /(what they do|description|products?|services?|items?|goods|nature|industry|sector)/i],
  ["location", /(location|town|city|county|address|area|region|where)/i],
  ["email", /e-?mail/i],
  ["phone", /(phone|tel|mobile|contact ?no|number)/i],
  ["tags", /(tags?|labels?|keywords?)/i],
]

/** First guess at what each column is. The person corrects it on screen. */
export function guessMapping(headers: string[]): TargetField[] {
  const used = new Set<TargetField>()
  return headers.map((h) => {
    const header = h.trim()
    for (const [field, test] of HINTS) {
      if (test.test(header) && !used.has(field)) {
        used.add(field)
        return field
      }
    }
    return "skip" as TargetField
  })
}

/** Rows shaped the way the import action wants them. */
export type ImportRow = {
  name: string
  category?: string
  what_they_do?: string
  location?: string
  phone?: string
  email?: string
  tags?: string
  contact_name?: string
  contact_title?: string
  contact_phone?: string
  contact_email?: string
}

export function buildRows(sheet: Sheet, mapping: TargetField[]): ImportRow[] {
  return sheet.rows
    .map((cells) => {
      const row: Record<string, string> = {}
      mapping.forEach((field, i) => {
        if (field === "skip") return
        const value = (cells[i] ?? "").trim()
        if (value) row[field] = value
      })
      return row as ImportRow
    })
    .filter((r) => (r.name ?? "").length > 1)
}
