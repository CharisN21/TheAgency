/**
 * A suggested conversation for a flag, built from what the person wrote:
 * situation, behaviour, impact, then a question and one agreed change. It is
 * a path to follow, not words to read out.
 */
export function conversationScript(f: {
  situation: string
  behaviour: string
  impact: string
  aboutName?: string
}) {
  const name = f.aboutName?.split(" ")[0]
  const tidy = (s: string) => s.trim().replace(/[.\s]+$/, "")
  const lower = (s: string) => tidy(s).charAt(0).toLowerCase() + tidy(s).slice(1)

  return [
    {
      step: "Open",
      say: `${name ? `${name}, ` : ""}can we take ten minutes? There is something I would like to understand better, not to blame anyone.`,
    },
    { step: "Situation", say: `During ${lower(f.situation)},` },
    { step: "Behaviour", say: `I noticed ${lower(f.behaviour)}.` },
    { step: "Impact", say: `The effect was that ${lower(f.impact)}.` },
    {
      step: "Ask",
      say: "How do you see it? What got in the way?",
      note: "Then listen. Most of what you need comes from the answer.",
    },
    {
      step: "Agree one change",
      say: "What is one thing we will do differently from now on, and how will we both know it is working?",
      note: "One change, said back in their words. Write it down when you log the conversation.",
    },
  ]
}
