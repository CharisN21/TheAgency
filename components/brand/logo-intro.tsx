"use client"

import { useEffect, useState } from "react"
import { Mark } from "./logo"

/**
 * The landing-page logo sequence: the tile blurs in, the brass ring draws itself
 * while swinging into place, the A strokes draw, one sheen passes, and the name
 * rises per letter out of a blur. Plays once, about 1.5s. Skipped entirely when
 * the reader asks for reduced motion.
 */
export function LogoIntro({ size = 88 }: { size?: number }) {
  const [run, setRun] = useState(false)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const id = requestAnimationFrame(() => setRun(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className={`brand-intro flex flex-col items-center gap-4 ${run ? "run" : ""}`}>
      <span className="relative">
        <Mark size={size} animated />
        <span className="brand-sheen" aria-hidden="true">
          <i />
        </span>
      </span>
      <span className="brand-word text-2xl font-semibold tracking-[0.2em] sm:text-3xl">
        {"THE AGENCY".split("").map((c, i) => (
          <span key={i} style={{ "--k": i } as React.CSSProperties}>
            {c === " " ? " " : c}
          </span>
        ))}
      </span>
    </div>
  )
}
