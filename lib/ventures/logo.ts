import "server-only"

import { mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

import sharp from "sharp"

/**
 * A venture's logo. The file someone uploads is never kept: it is checked to
 * be a real JPG, PNG or WebP, then drawn again as a clean 256 by 256 picture,
 * which drops anything hidden inside the original (location data, scripts
 * dressed up as images). Logos are a venture's public mark, like its name on a
 * banner, so they are served to anyone who has the address.
 *
 * On a laptop they live in the git-ignored data folder. With Supabase they move
 * to a Storage bucket; only this file changes.
 */
export const MAX_LOGO_BYTES = 2 * 1024 * 1024
const SIZE = 256
const NAME = /^[0-9a-f-]{36}-\d{13}\.webp$/

const folder = () => path.join(process.env.AGENCY_DATA_DIR ?? path.join(process.cwd(), ".data"), "logos")

/** The kind of picture, from its first bytes, never from its name or what the browser claims. */
function kindOf(b: Buffer): "jpeg" | "png" | "webp" | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg"
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png"
  if (b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "webp"
  return null
}

export type LogoResult = { ok: true; file: string } | { ok: false; message: string }

/** Checks, redraws and saves a logo for a venture. Returns the stored file's name. */
export async function saveLogo(ventureId: string, upload: unknown): Promise<LogoResult> {
  if (!(upload instanceof File) || upload.size === 0) return { ok: false, message: "Choose a picture for the logo" }
  if (upload.size > MAX_LOGO_BYTES) return { ok: false, message: "That picture is over 2 MB. Choose a smaller one." }
  const raw = Buffer.from(await upload.arrayBuffer())
  if (!kindOf(raw)) return { ok: false, message: "The logo must be a JPG, PNG or WebP picture" }

  let clean: Buffer
  try {
    clean = await sharp(raw, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(SIZE, SIZE, { fit: "cover" })
      .webp({ quality: 90 })
      .toBuffer()
  } catch {
    return { ok: false, message: "That picture could not be read. Try another one." }
  }

  const file = `${ventureId}-${Date.now()}.webp`
  await mkdir(folder(), { recursive: true })
  await writeFile(path.join(folder(), file), clean)
  return { ok: true, file }
}

export async function deleteLogo(file: string | undefined) {
  if (!file || !NAME.test(file)) return
  await unlink(path.join(folder(), file)).catch(() => {})
}

/** Reads a stored logo by its name, or null. Only names this file made are accepted. */
export async function readLogo(file: string): Promise<Buffer | null> {
  if (!NAME.test(file)) return null
  try {
    return await readFile(path.join(folder(), file))
  } catch {
    return null
  }
}

/** Where the browser loads a logo from. */
export const logoUrl = (file: string | undefined) => (file && NAME.test(file) ? `/venture-logo/${file}` : undefined)
