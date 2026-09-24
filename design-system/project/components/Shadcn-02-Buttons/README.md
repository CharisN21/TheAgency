# shadcn/ui · Buttons

Six variants — `default`, `secondary`, `outline`, `ghost`, `destructive`, `link` — and sizes `xs` 24, `sm` 32, `default` 36, `lg` 40, plus square icon sizes. Radius 8px (`--radius-md`), 14px medium text, 16px icons, `transition-all` on hover, focus draws a 3px ring at 50% opacity, disabled drops to 50%.

Ours maps almost one-to-one: primary → `default`, secondary → `outline`, tinted → `secondary`, plain → `ghost`/`link`, danger → `destructive`.

**Worth borrowing:** the `xs` size (we have nothing that small, useful for dense rows later), the `ghost` hover behaviour, and the variant names themselves — if we name ours the same way, every shadcn component drops in without edits.
