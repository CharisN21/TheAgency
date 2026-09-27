# Page bands

Every signed-in page is built from full-width bands (`components/app/band.tsx` in the app).

## Tones

- **Lead** — `accent-soft` at 70%, with a hairline of `accent` at 10% below. One per page, first: the greeting, the record's name, the key numbers. This is a second use of `accent-soft`, alongside selected rows.
- **Plain** — `bg`, no border.
- **Soft** — `fill` at 60%, with `separator` hairlines above and below.

After the lead, tones alternate plain, soft, plain by position among the bands actually shown (`toneAfterLead`), so neighbours always differ even when a section is hidden.

## Number tile (`BandStat`)

Label in caps, the figure, one line of help. A figure in a status colour always has its meaning in the help line. On a phone the tiles sit side by side and the help line is hidden.

## Widths

Narrow (896px) for reading pages, normal (1024px) for record pages, wide (full width) for boards and tables. Side padding 16px on a phone, 32px from tablet up.

## Motion

Arrive: rise 10px and fade in over 240ms, ease-out, staggered 60ms. Reveal: bands below the fold rise 14px as they scroll into view, via a CSS scroll timeline; unsupported browsers show them as they are. Both are off under `prefers-reduced-motion`.
