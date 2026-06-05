# First Contact — bundled lifeform assets

Drop the bundled "first discovered lifeform" (greenhouse first contact) media
here. `LifeformRevealModal` loads them by default for the first-contact common:

| File | Used by | Recommended |
|---|---|---|
| `photo.webp` | scan beat (pixel/scan reveal) | 4:3, WebP q~82, < 400 KB |
| `video.webm` | reveal beat (plays with sound) | 4:3, VP9 + Opus, ~5 s, < 2.5 MB |

Current bundled microbe (test free first-contact): `photo.webp` 1440×1080 (~120 KB),
`video.webm` 1280×960 VP9/Opus 5 s (~1.1 MB).

Notes:
- The media is shown INSIDE a centred popup window (not full-screen), so 720p–1080p
  is plenty and keeps the app bundle small.
- If a file is missing, the modal shows a themed placeholder, so the whole
  flow stays testable before the art is added.
- These assets are the same for everyone (free one-time hook). Later lifeforms
  are generated uniquely per player and unlocked with quarks.

## File-size guidance for unique paid media (streamed, not bundled)

Paid Alpha-photo/-video are generated per player by Kling v3 omni (4K) and are
**served from URLs** (Vercel Blob / Kling), NOT bundled. Rough sizes:

| Asset | Format | ~Size |
|---|---|---|
| 4K still (optimized) | WebP q~80 | ~0.6–1.5 MB |
| 4K still (optimized) | AVIF q~50 | ~0.3–0.8 MB |
| Short 4K clip (5s) | WebM (VP9) | ~3–8 MB |

For the **bundled common** fallback keep it tiny — see `../common/`.
