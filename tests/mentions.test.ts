import { describe, expect, it } from "vitest"

import { handleFor, matchTag, openTag, parseMentions } from "@/lib/chat/mentions"

const team = [
  { id: "a", name: "Achieng Njeri" },
  { id: "w", name: "Wanjiru Kamau" },
  { id: "m1", name: "Mercy Wambui" },
  { id: "m2", name: "Mercy Otieno" },
  { id: "o", name: "O'Brien Mwangi" },
]

describe("parseMentions", () => {
  it("finds people by first name, once each, in the order tagged", () => {
    expect(parseMentions("@Wanjiru and @Achieng, please send the quote. @wanjiru again", team)).toEqual(["w", "a"])
  })

  it("ignores letters after the name, an email address and a word that merely contains @", () => {
    expect(parseMentions("@Achiengs is not Achieng", team)).toEqual([])
    expect(parseMentions("write to achieng@example.com", team)).toEqual([])
    expect(parseMentions("price@Achieng", team)).toEqual([])
  })

  it("a first name two people share tags nobody; the full name tags the right one", () => {
    expect(parseMentions("@Mercy can you call them?", team)).toEqual([])
    expect(parseMentions("@Mercy Wambui can you call them?", team)).toEqual(["m1"])
    expect(parseMentions("@Mercy Otieno, and @Achieng", team)).toEqual(["m2", "a"])
  })

  it("handles punctuation and names with special characters", () => {
    expect(parseMentions("Thanks @Achieng.", team)).toEqual(["a"])
    expect(parseMentions("(@Wanjiru)", team)).toEqual(["w"])
    expect(parseMentions("@O'Brien Mwangi will help", team)).toEqual(["o"])
  })

  it("returns nothing for plain text", () => {
    expect(parseMentions("no tags here", team)).toEqual([])
    expect(parseMentions("", team)).toEqual([])
  })
})

describe("typing a tag", () => {
  it("offers people while an @ is open at the end of the draft", () => {
    expect(openTag("please ask @Wa")).toEqual({ query: "Wa", start: 11 })
    expect(openTag("@")).toEqual({ query: "", start: 0 })
    expect(openTag("email me at x@")).toBeNull()
    expect(openTag("done @Achieng ")).toBeNull()
  })

  it("matches by the start of the first or full name", () => {
    expect(matchTag("wa", team).map((p) => p.id)).toEqual(["w"])
    expect(matchTag("mer", team).map((p) => p.id)).toEqual(["m2", "m1"])
    expect(matchTag("", team)).toHaveLength(5)
  })

  it("inserts a full name only where a first name is shared", () => {
    expect(handleFor(team[0], team)).toBe("Achieng")
    expect(handleFor(team[2], team)).toBe("Mercy Wambui")
  })
})
