# Skeletons

Every list and card that waits on the network shows a skeleton of the same shape, not a spinner — so the layout never shifts when data lands.

Shimmer loops at `duration-skeleton` (1100ms) and stops entirely under `prefers-reduced-motion`. Screen readers get `aria-busy="true"` on the region, and focus stays where it was.
