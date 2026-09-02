# Card art drop-in folder

Put the 28 card images here, named by 3-digit id: `001.jpg` … `028.jpg`
(matching the `image` field in `src/data/cards.json`). WebP works too — the
app tries `<id>.webp` first, falls back to `<id>.jpg`, and falls back to a
styled placeholder if neither exists yet.

Recommended: square-ish crop, 600×600px minimum, centered subject (the art
zone is wider than tall in the mini grid card, near-square in the large
card).

See `id → name → rarity → type` in `src/data/cards.json`.
