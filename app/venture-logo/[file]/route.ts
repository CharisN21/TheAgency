import { readLogo } from "@/lib/ventures/logo"

/**
 * Serves a venture's logo. Each upload gets a new name, so a logo can be
 * cached for good. Only names the app made are accepted.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  const logo = await readLogo(file)
  if (!logo) return new Response("Not found", { status: 404 })
  return new Response(new Uint8Array(logo), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
