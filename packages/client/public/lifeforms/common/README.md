# Common lifeform — bundled asset

This is the shared, free fallback shown for **common** found lifeforms when no
unique paid Alpha-photo has been generated.

| File | Used by | Recommended |
|---|---|---|
| `photo.webp` | `LifeformRevealModal` scan beat + Archive "Life" thumbnail | 1:1 or 4:3, ~1K, WebP, < 120 KB |

Notes:
- Keep it small — it ships in the app bundle and is the same for everyone.
- If the file is missing, a themed placeholder glyph is shown instead, so the
  flow stays testable before art is added.
- Uncommon and rarer lifeforms do NOT use this; they generate unique 4K media
  per player (streamed from URLs, see `../first/README.md`).
