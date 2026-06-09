# Common (simple) lifeforms — bundled assets

The 28 free **simple** lifeforms ship in the app bundle. Each common discovery
reveals the next not-yet-collected species (see `SIMPLE_LIFEFORMS` in
`@nebulife/core` → `game/lifeform.ts`) so a player unlocks the whole set in
~1 month of active play. Once all 28 are owned, re-finds are duplicates and are
NOT saved to the gallery.

| File | Used by | Format |
|---|---|---|
| `<key>.webp` | reveal scan beat + Archive "Life" thumbnail | WebP q82, 1447×1080, ~130 KB |
| `<key>.webm` | reveal video beat (plays with ambient sound) | VP9 + Opus, 1284×960, ~5 s, ~1.3 MB |

`<key>` is the stable slug from `SIMPLE_LIFEFORMS` (e.g. `shifting-amoeba`,
`crown-rotifer`, `helio-disc`). The discovery flow persists the relative asset
URLs (`/lifeforms/common/<key>.webp|webm`) onto the lifeform record so the
correct art survives a reload, and the species key is recovered from that URL
for dedup + localized naming.

`photo.webp` (no key) is the legacy generic fallback shown only if a record has
no per-species `photo_url`.

Uncommon and rarer lifeforms do NOT use these; they generate unique paid Alpha
media per player (streamed from URLs, see `../first/README.md`).
