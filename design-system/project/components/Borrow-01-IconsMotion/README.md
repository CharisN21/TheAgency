# Borrowable · Icons and motion

**Licences.** Material is MIT (its bundled Roboto is Apache 2.0, and its icon PNGs are Google's Material Design icons, also Apache 2.0). shadcn/ui is MIT and is *designed* to be copied into your repo. Lucide is ISC. All of it is free to use commercially, with the licence file kept.

**Icons.** We stay on Lucide unless you prefer a lighter or heavier line. shadcn supports Lucide, Tabler, Phosphor, Remix and Hugeicons, switchable in `components.json`, so this is not a decision we are locked into. Material's icon PNGs are Android-style glyphs and would look out of place next to an iOS-feel shell.

**Motion.** shadcn's values sit right on top of ours (150ms for controls, 200ms for popovers, ease-out), so adopting its components costs nothing in feel. The one thing worth taking from Material is the *idea* of a press response; the ripple itself reads as Android, so a 150ms scale or tint is a better fit.

**Recommendation:** Lucide icons, shadcn motion values, our 150–250ms ease-out envelope, and `prefers-reduced-motion` respected everywhere.
