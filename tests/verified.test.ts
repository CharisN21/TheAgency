import { beforeEach, describe, expect, it, vi } from "vitest"

import { checkStatus, clearChecked, markChecked } from "@/lib/crypto/verified"

/** A stand-in for the browser's localStorage. */
function fakeStorage(options: { failWrites?: boolean } = {}) {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (options.failWrites) throw new Error("storage is full or blocked")
      data.set(k, v)
    },
  }
}

describe("safety numbers you have checked", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", fakeStorage())
  })

  it("starts unchecked, and is verified once you mark it", () => {
    expect(checkStatus("me", "her", "111")).toBe("unchecked")
    expect(markChecked("me", "her", "111")).toBe(true)
    expect(checkStatus("me", "her", "111")).toBe("verified")
  })

  it("says changed when the number is no longer the one you checked", () => {
    markChecked("me", "her", "111")
    expect(checkStatus("me", "her", "222")).toBe("changed")
    // Checking again replaces it.
    markChecked("me", "her", "222")
    expect(checkStatus("me", "her", "222")).toBe("verified")
  })

  it("keeps each person, and each of your accounts, apart", () => {
    markChecked("me", "her", "111")
    expect(checkStatus("me", "him", "111")).toBe("unchecked")
    expect(checkStatus("someone-else-on-this-browser", "her", "111")).toBe("unchecked")
  })

  it("removing a check makes it unchecked again", () => {
    markChecked("me", "her", "111")
    clearChecked("me", "her")
    expect(checkStatus("me", "her", "111")).toBe("unchecked")
  })

  it("tells you when the browser would not keep the check", () => {
    vi.stubGlobal("localStorage", fakeStorage({ failWrites: true }))
    expect(markChecked("me", "her", "111")).toBe(false)
    expect(checkStatus("me", "her", "111")).toBe("unchecked")
  })

  it("survives storage holding something unreadable", () => {
    const bad = fakeStorage()
    bad.setItem("agency-safety-checked:me", "not json {")
    vi.stubGlobal("localStorage", bad)
    expect(checkStatus("me", "her", "111")).toBe("unchecked")
    expect(markChecked("me", "her", "111")).toBe(true)
  })
})
