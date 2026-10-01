import { mkdtempSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { vi } from "vitest"

// A throwaway data folder, so tests never touch .data/agency.json.
process.env.AGENCY_DATA_DIR = mkdtempSync(path.join(os.tmpdir(), "agency-test-"))

/** Who the tests are signed in as, and which workspace they asked for. */
export const signedIn: { userId?: string; workspaceId?: string } = {}

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value =
        name === "agency_user" ? signedIn.userId : name === "agency_workspace" ? signedIn.workspaceId : undefined
      return value ? { name, value } : undefined
    },
    set: () => {},
    delete: () => {},
  }),
}))

vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }))

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`)
  },
  notFound: () => {
    throw new Error("notFound")
  },
}))
