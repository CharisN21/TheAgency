import { ImageResponse } from "next/og"
import type { NextRequest } from "next/server"

/**
 * The square shown beside a banner and used as a workspace's mark: its colour
 * and first letter. Everything it needs is in the address, so it looks nothing
 * up, shows nothing private, and can be cached for good.
 */
export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams
  const letter = Array.from(q.get("l") ?? "")[0]
  const hex = q.get("c") ?? ""
  if (!letter || !/^[\p{L}\p{N}]$/u.test(letter) || !/^[0-9a-fA-F]{6}$/.test(hex)) {
    return new Response("Not found", { status: 404 })
  }
  const size = 192

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `#${hex}`,
          color: "#ffffff",
          fontSize: 112,
          fontWeight: 700,
        }}
      >
        {letter.toUpperCase()}
      </div>
    ),
    {
      width: size,
      height: size,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    },
  )
}
