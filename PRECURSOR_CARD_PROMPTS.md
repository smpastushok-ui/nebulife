# Precursor Signals — "Сигнали Предтеч" — Card Art Prompts

**Status: GENERATED (2026-07-07).** All 14 cards generated via Higgsfield MCP server
`plugin-higgsfield-higgsfield`, tool `generate_image`, model `gpt_image_2`, and optimized into
`packages/client/public/precursor-cards/<id>.webp`. See "Generation record" below for
per-card job ids, source URLs, and final file sizes.

## Generation record

- Model: `gpt_image_2`. Params requested: `aspect_ratio: "3:4"`, `count: 1`. No explicit
  `resolution` param exists in the MCP tool schema (only `model`, `prompt`, `count`,
  `aspect_ratio`, `medias`, `get_cost`), so it was omitted; the server auto-adjusted
  `resolution` → `1k` and `quality` → `low` as model defaults on every call (non-fatal
  adjustment, accepted as instructed).
- Hero card `signal-origin` generated first (job `e7e88582-cbea-4402-be8e-970d58676e27`).
- Style reference workflow: the hero card's **job id was passed directly** as
  `medias: [{ value: "<hero-job-id>", role: "image" }]` for all 13 remaining cards — this
  worked without any `media_import_url` import step (job ids are accepted directly as media
  values by `generate_image`, contrary to the prior outage-era assumption that only UUIDs
  from `media_import_url`/`media_upload` work).
- Hit `Rate limit reached: max 8 concurrent job(s) on ultimate (annual) plan` once when
  submitting the 12th job while too many prior jobs were still in flight; resolved by polling
  existing jobs to completion via `job_status` before resubmitting the blocked card
  (`signal-drift`). No card required more than 1 attempt otherwise.
- Optimization: Node + `sharp` script `scripts/bake-precursor-cards.mjs`, resize to 768×1024
  (`fit: cover`), WebP quality starting at 82 and stepping down by 6 until ≤150KB. All 14 cards
  fit within budget at the first attempt (quality 82, no step-down needed).

| id | rarity | job id | source URL | final size |
|---|---|---|---|---|
| `signal-origin` | legendary | `e7e88582-cbea-4402-be8e-970d58676e27` | https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000336_e7e88582-cbea-4402-be8e-970d58676e27.png | 66.8 KB (q82) |
| `signal-weaver` | legendary | `d22d2c30-942f-4adc-a9ab-c9aabe1312c0` | https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000416_d22d2c30-942f-4adc-a9ab-c9aabe1312c0.png | 110.6 KB (q82) |
| `signal-engine` | epic | `1b8219e7-fee2-461f-996b-277458ef401c` | https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000503_1b8219e7-fee2-461f-996b-277458ef401c.png | 109.4 KB (q82) |
| `signal-archive` | epic | `3830edc8-e9ba-441b-bf20-4fcc6a549491` | https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000506_3830edc8-e9ba-441b-bf20-4fcc6a549491.png | 61.8 KB (q82) |
| `signal-gate` | epic | `d2e72274-486e-418a-9eef-8188497b9bd9` | https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000509_d2e72274-486e-418a-9eef-8188497b9bd9.png | 60.8 KB (q82) |
| `signal-lattice` | rare | `892e3b92-0682-4fe4-a040-e676bee44564` | https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000513_892e3b92-0682-4fe4-a040-e676bee44564.png | 109.9 KB (q82) |
| `signal-helix` | rare | `8d653c16-a74b-419c-b65c-898740dc90bb` | https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000516_8d653c16-a74b-419c-b65c-898740dc90bb.png | 72.3 KB (q82) |
| `signal-mirror` | rare | `b3bd9d3c-b74b-4e36-910b-4cbd340ac700` | https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000520_b3bd9d3c-b74b-4e36-910b-4cbd340ac700.png | 45.7 KB (q82) |
| `signal-beacon` | rare | `b9edb94e-9a9f-40be-a9d5-78b013e74d9c` | https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000529_b9edb94e-9a9f-40be-a9d5-78b013e74d9c.png | 66.7 KB (q82) |
| `signal-echo` | common | `13dc8303-4473-447b-8154-0f789241d08a` | https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000532_13dc8303-4473-447b-8154-0f789241d08a.png | 49.0 KB (q82) |
| `signal-pulse` | common | `995dd128-3b49-4c4d-9e7d-cb35565141de` | https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000536_995dd128-3b49-4c4d-9e7d-cb35565141de.png | 60.3 KB (q82) |
| `signal-dust` | common | `b780b3bd-a85f-4e01-be31-06427330e920` | https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000539_b780b3bd-a85f-4e01-be31-06427330e920.png | 90.1 KB (q82) |
| `signal-ice` | common | `76d9b0f7-a957-4240-b95a-b6cfd43075c9` | https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000541_76d9b0f7-a957-4240-b95a-b6cfd43075c9.png | 95.5 KB (q82) |
| `signal-drift` | common | `d6f208f0-7eb9-49b3-94a1-38d1d7ea1761` | https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_000638_d6f208f0-7eb9-49b3-94a1-38d1d7ea1761.png | 62.4 KB (q82) |

Note: source URLs are CloudFront-hosted Higgsfield generation outputs and may expire over time;
the durable reproducibility anchor is the `job_id` (retrievable via `job_status`/`generate list`
against the Higgsfield account) plus the exact prompts recorded below. Final optimized files
already live in the repo at `packages/client/public/precursor-cards/<id>.webp`.

To regenerate or re-run the optimization pipeline from scratch, see
`scripts/bake-precursor-cards.mjs`.

## Generation parameters (all cards)

- **Model:** `gpt_image_2` (GPT Image 2)
- **Resolution:** 1K
- **Aspect ratio:** `3:4` (portrait, collectible card format)
- **Style reference workflow:** card #1 (`signal-origin`) generated first as the HERO/style anchor;
  all other 13 cards generated with card #1's output image passed back in as a reference input.
- **Negative constraints (append to every prompt):** no text, no lettering, no watermark, no
  signature, no human figures, no cartoon or illustration style, no bright/saturated colors.
- **Shared style direction:** dark deep-space background in `#020510` tones, NASA/JWST-grade
  photographic realism fused with ancient-alien-artifact mystique, one single centered subject,
  subtle monochrome glyph accents etched or floating near the subject, a thin luminous elegant
  sci-fi card-frame border rendered directly into the image (no UI chrome, no text on the frame),
  muted overall palette with exactly one accent color reserved for the rarity tier.

## Rarity accent colors

| Rarity | Accent color |
|---|---|
| legendary | warm gold-white |
| epic | violet-blue |
| rare | cyan `#4488aa` |
| common | cool gray-blue |

## Card prompts

### 1. `signal-origin` — Першоджерело — legendary — **HERO CARD (style reference source)**

```
A single primordial glowing glyph-orb hovering motionless at the center of a vast dark deep-space
void in #020510 tones — the first signal ever emitted by an ancient precursor civilization.
NASA/JWST-grade photographic realism fused with the mystique of an impossibly old alien artifact.
The orb is a smooth sphere of warm gold-white light with faint internal fracture-lines like frozen
lightning, surrounded by a thin halo of drifting cosmic dust catching the light. Subtle monochrome
glyph accents — ancient geometric symbols, not readable text — orbit faintly around the orb like
suspended runes. A thin luminous elegant sci-fi card-frame border in warm gold-white is rendered
directly into the image around the full edge of the frame, delicate and refined, no UI elements.
Muted, restrained palette overall; the gold-white glow of the orb and frame is the single accent
color, everything else desaturated near-black space and cool grays. Cinematic depth of field,
soft volumetric light falloff, ultra-detailed textures, no text, no lettering, no watermark, no
signature, no human figures, no cartoon or illustration style, no bright or saturated colors.
```

### 2. `signal-weaver` — Печатка Ткача — legendary

```
An intricate ancient seal or sigil woven entirely from threads of starlight, floating centered
against a deep dark space background in #020510 tones. NASA/JWST-grade photographic realism
merged with the mystique of a precursor-civilization relic. The sigil is composed of impossibly
fine luminous filaments interlacing into a symmetrical geometric emblem, warm gold-white light
tracing every strand, with faint monochrome glyph accents embedded within the weave like ancient
inscriptions (not legible text). A thin luminous elegant sci-fi card-frame border in warm
gold-white is rendered directly into the image around the full edge, delicate and refined.
Muted, restrained overall palette with the gold-white glow as the single accent color against
desaturated near-black space and cool grays. Cinematic depth of field, soft volumetric light,
ultra-detailed fine linework, no text, no lettering, no watermark, no signature, no human figures,
no cartoon or illustration style, no bright or saturated colors.
```

### 3. `signal-engine` — Серце Двигуна Предтеч — epic

```
The dormant core of an ancient precursor megamachine, a massive centered mechanical-organic heart
structure suspended in dark deep space in #020510 tones. NASA/JWST-grade photographic realism
fused with ancient-alien-artifact mystique. The core shows layered concentric rings of dark
weathered alloy wrapped around a faintly pulsing violet-blue energy chamber at its center, dormant
but not dead, with fine monochrome glyph accents etched into its outer plating. A thin luminous
elegant sci-fi card-frame border in violet-blue is rendered directly into the image around the
full edge, delicate and refined. Muted, restrained overall palette with violet-blue as the single
accent color against desaturated near-black space and cool grays. Cinematic depth of field, soft
volumetric light falloff, ultra-detailed hard-surface textures, no text, no lettering, no
watermark, no signature, no human figures, no cartoon or illustration style, no bright or
saturated colors.
```

### 4. `signal-archive` — Архів Цивілізації Нуль — epic

```
A tall crystalline data monolith belonging to a lost precursor civilization, centered and floating
slightly above a dark deep-space void in #020510 tones. NASA/JWST-grade photographic realism fused
with ancient-alien-artifact mystique. The monolith is a faceted translucent crystal slab with faint
violet-blue light pulsing through internal fracture planes, its surface etched with rows of subtle
monochrome glyph accents (ancient inscriptions, not legible text) glowing faintly from within.
A thin luminous elegant sci-fi card-frame border in violet-blue is rendered directly into the image
around the full edge, delicate and refined. Muted, restrained overall palette with violet-blue as
the single accent color against desaturated near-black space and cool grays. Cinematic depth of
field, soft volumetric light, ultra-detailed crystalline textures, no text, no lettering, no
watermark, no signature, no human figures, no cartoon or illustration style, no bright or
saturated colors.
```

### 5. `signal-gate` — Фрагмент Брами — epic

```
A broken fragment of an ancient ring-gate, a curved segment of alien megastructure drifting alone
in dark deep space in #020510 tones. NASA/JWST-grade photographic realism fused with
ancient-alien-artifact mystique. The fragment shows weathered dark metal-like material with a
faint violet-blue energy field still flickering along its inner broken edge, fine monochrome glyph
accents etched along its curved surface. A thin luminous elegant sci-fi card-frame border in
violet-blue is rendered directly into the image around the full edge, delicate and refined. Muted,
restrained overall palette with violet-blue as the single accent color against desaturated
near-black space and cool grays. Cinematic depth of field, soft volumetric light falloff,
ultra-detailed weathered hard-surface textures, no text, no lettering, no watermark, no signature,
no human figures, no cartoon or illustration style, no bright or saturated colors.
```

### 6. `signal-lattice` — Ґратка Предтеч — rare

```
A vast geometric lattice structure of precursor origin stretched across a distant nebula, centered
in the frame against a dark deep-space background in #020510 tones. NASA/JWST-grade photographic
realism fused with ancient-alien-artifact mystique. The lattice is a delicate wireframe of
crystalline struts glowing faintly cyan, forming a symmetrical geometric pattern silhouetted
against soft nebula clouds, with subtle monochrome glyph accents at its intersecting nodes. A thin
luminous elegant sci-fi card-frame border in cyan #4488aa is rendered directly into the image
around the full edge, delicate and refined. Muted, restrained overall palette with cyan #4488aa as
the single accent color against desaturated near-black space and cool grays. Cinematic depth of
field, soft volumetric light, ultra-detailed fine geometric structure, no text, no lettering, no
watermark, no signature, no human figures, no cartoon or illustration style, no bright or
saturated colors.
```

### 7. `signal-helix` — Спіраль Генома — rare

```
A double-helix of pure light representing an ancient xeno-biology motif, centered and floating in
dark deep space in #020510 tones. NASA/JWST-grade photographic realism fused with
ancient-alien-artifact mystique. The helix strands glow faintly cyan, twisting gracefully with
fine luminous rungs connecting them, subtle monochrome glyph accents drifting alongside like
encoded data points. A thin luminous elegant sci-fi card-frame border in cyan #4488aa is rendered
directly into the image around the full edge, delicate and refined. Muted, restrained overall
palette with cyan #4488aa as the single accent color against desaturated near-black space and cool
grays. Cinematic depth of field, soft volumetric light falloff, ultra-detailed luminous strand
textures, no text, no lettering, no watermark, no signature, no human figures, no cartoon or
illustration style, no bright or saturated colors.
```

### 8. `signal-mirror` — Дзеркальний Сигнал — rare

```
An ancient signal reflected across a polished obsidian plane floating in dark deep space in
#020510 tones. NASA/JWST-grade photographic realism fused with ancient-alien-artifact mystique.
The obsidian surface is perfectly smooth and centered in frame, catching a faint cyan-tinted
reflection of a distant light source, its edge etched with subtle monochrome glyph accents. A thin
luminous elegant sci-fi card-frame border in cyan #4488aa is rendered directly into the image
around the full edge, delicate and refined. Muted, restrained overall palette with cyan #4488aa as
the single accent color against desaturated near-black space and cool grays. Cinematic depth of
field, soft volumetric light, ultra-detailed reflective surface rendering, no text, no lettering,
no watermark, no signature, no human figures, no cartoon or illustration style, no bright or
saturated colors.
```

### 9. `signal-beacon` — Згаслий Маяк — rare

```
A dead beacon tower standing alone on an airless alien world, centered against a dark starfield sky
in #020510 tones. NASA/JWST-grade photographic realism fused with ancient-alien-artifact mystique.
The tower is a slender weathered structure with a cracked, unlit lens crown, faint residual cyan
light barely flickering within its core, fine monochrome glyph accents etched along its base. A
thin luminous elegant sci-fi card-frame border in cyan #4488aa is rendered directly into the image
around the full edge, delicate and refined. Muted, restrained overall palette with cyan #4488aa as
the single accent color against desaturated near-black space and cool grays. Cinematic depth of
field, soft volumetric light falloff, ultra-detailed weathered surface textures, no text, no
lettering, no watermark, no signature, no human figures, no cartoon or illustration style, no
bright or saturated colors.
```

### 10. `signal-echo` — Відлуння Пустоти — common

```
Faint concentric waves rippling silently through deep space, centered against a dark void in
#020510 tones. NASA/JWST-grade photographic realism fused with ancient-alien-artifact mystique.
The waves are barely-visible rings of cool gray-blue light expanding outward from an unseen
distant source, with subtle monochrome glyph accents faintly visible where the rings intersect. A
thin luminous elegant sci-fi card-frame border in cool gray-blue is rendered directly into the
image around the full edge, delicate and refined. Muted, restrained overall palette with cool
gray-blue as the single accent color against desaturated near-black space. Cinematic depth of
field, soft volumetric light, ultra-detailed subtle wave textures, no text, no lettering, no
watermark, no signature, no human figures, no cartoon or illustration style, no bright or
saturated colors.
```

### 11. `signal-pulse` — Пульс Далекої Зорі — common

```
Rhythmic pulsar beams sweeping through dark space from a distant neutron star, centered in frame
against a deep-space background in #020510 tones. NASA/JWST-grade photographic realism fused with
ancient-alien-artifact mystique. Two narrow cool gray-blue beams of light cross the frame in a
precise symmetrical pattern, with subtle monochrome glyph accents faintly overlaid near the beam
origin. A thin luminous elegant sci-fi card-frame border in cool gray-blue is rendered directly
into the image around the full edge, delicate and refined. Muted, restrained overall palette with
cool gray-blue as the single accent color against desaturated near-black space. Cinematic depth of
field, soft volumetric light falloff, ultra-detailed beam and starfield textures, no text, no
lettering, no watermark, no signature, no human figures, no cartoon or illustration style, no
bright or saturated colors.
```

### 12. `signal-dust` — Шепіт Зоряного Пилу — common

```
A drifting cloud of fine stardust centered against a dark deep-space background in #020510 tones,
carrying a faint hidden pattern within its swirl. NASA/JWST-grade photographic realism fused with
ancient-alien-artifact mystique. The dust cloud is soft and diffuse in cool gray-blue tones, with
subtle monochrome glyph accents barely perceptible woven into the drifting particles. A thin
luminous elegant sci-fi card-frame border in cool gray-blue is rendered directly into the image
around the full edge, delicate and refined. Muted, restrained overall palette with cool gray-blue
as the single accent color against desaturated near-black space. Cinematic depth of field, soft
volumetric light, ultra-detailed particulate textures, no text, no lettering, no watermark, no
signature, no human figures, no cartoon or illustration style, no bright or saturated colors.
```

### 13. `signal-ice` — Крижаний Код — common

```
Ancient glyphs frozen deep inside a comet's icy core, centered against a dark deep-space background
in #020510 tones. NASA/JWST-grade photographic realism fused with ancient-alien-artifact mystique.
The comet fragment is a translucent block of cracked ice with a faint cool gray-blue glow
emanating from within, subtle monochrome glyph accents visible suspended inside the ice like
trapped inscriptions. A thin luminous elegant sci-fi card-frame border in cool gray-blue is
rendered directly into the image around the full edge, delicate and refined. Muted, restrained
overall palette with cool gray-blue as the single accent color against desaturated near-black
space. Cinematic depth of field, soft volumetric light falloff, ultra-detailed icy translucent
textures, no text, no lettering, no watermark, no signature, no human figures, no cartoon or
illustration style, no bright or saturated colors.
```

### 14. `signal-drift` — Дрейф Частот — common

```
A wandering ribbon of frequency energy drifting silently across a distant starfield, centered
against a dark deep-space background in #020510 tones. NASA/JWST-grade photographic realism fused
with ancient-alien-artifact mystique. The ribbon is a thin sinuous band of cool gray-blue light
undulating gently through the frame, with subtle monochrome glyph accents faintly pulsing along
its length. A thin luminous elegant sci-fi card-frame border in cool gray-blue is rendered
directly into the image around the full edge, delicate and refined. Muted, restrained overall
palette with cool gray-blue as the single accent color against desaturated near-black space.
Cinematic depth of field, soft volumetric light, ultra-detailed luminous ribbon textures, no text,
no lettering, no watermark, no signature, no human figures, no cartoon or illustration style, no
bright or saturated colors.
```

## Optimization pipeline (once images exist)

Node script pattern (mirrors existing common-events asset pipeline in this repo):

```js
import sharp from "sharp";

await sharp(inputPath)
  .resize(768, 1024, { fit: "cover" })
  .webp({ quality: 82 })
  .toFile(`packages/client/public/precursor-cards/${id}.webp`);
```

Adjust `quality` down iteratively per-file until under the 150KB budget, keeping 768×1024 output.

## Supporting assets

Four supplementary Precursor UI assets, generated after the 14 card faces existed (used
`signal-origin.webp` as a Higgsfield-uploaded style/reference image — role `image` — for all four,
to keep a consistent art direction with the card gallery). Delivered to
`packages/client/public/precursor-cards/`.

| File | Purpose | Model | Aspect | Reference used | Result size |
|---|---|---|---|---|---|
| `card-back.webp` | Universal card back for flip animation | `gpt_image_2` | 3:4 | hero (`signal-origin.webp`) | 110.7KB (768×1024, quality 82) |
| `completion-artifact.webp` | Legendary 14/14 "Full Precursor Signal" reward | `gpt_image_2` | 3:4 | hero (`signal-origin.webp`) | 106.4KB (768×1024, quality 82) |
| `terminal-banner.webp` | Cosmic Archive / Terminal gallery header banner | `nano_banana_2` | 16:9 | hero (`signal-origin.webp`) | 134.1KB (1600×900, quality 82) |
| `share-card.webp` | Future OG/share visual | `nano_banana_2_lite` | 16:9 | hero (`signal-origin.webp`) | 136.0KB (1600×900, quality 82) |

### Reference upload

`signal-origin.webp` was uploaded to Higgsfield via `media_upload` (presigned S3 URL) → `curl PUT`
→ `media_confirm`, producing media id `49353182-59db-4bc5-af98-5ea6cc68ec34`, then passed as
`medias: [{ value: "<id>", role: "image" }]` on every `generate_image` call below.

### `card-back` prompt

```
dark sci-fi collectible card back, central sealed ancient glyph, no text, thin luminous frame,
warm gold-white and cyan accents, elegant precursor artifact surface, dark deep-space #020510
palette, no readable symbols, no watermark
```

Job id: `0c588233-8eb4-4e9a-bfb8-3eec93f395d3`.

### `completion-artifact` prompt

```
all precursor signals align into one radiant ancient transmission, layered rings and abstract
glyph geometry, warm gold-white legendary glow, deep-space background, no text, no watermark,
cinematic artifact realism
```

Job id: `457a6f63-0049-454d-9953-b71d94950b82`.

### `terminal-banner` prompt

```
dark archive terminal overlooking distant precursor card silhouettes, signal waves crossing a
starfield, elegant sci-fi frame elements, no text, dark #020510 palette with cyan/gold accents
```

Job id: `b93836aa-1e88-4052-8793-08bfe4297dcc`. Generated with `nano_banana_2` (Nano Banana 2 was
available per `generate_image` cost preflight; used as the brief's primary choice for this asset).

### `share-card` prompt

```
Nebulife Precursor Signals collection arranged as luminous card silhouettes around a central
ancient glyph, collectible mystery, no text, no watermark, cinematic deep-space palette
```

Job id: `23049a3b-3de1-4bf4-9329-76b8b792f674`. Generated with `nano_banana_2_lite` (available per
`generate_image` cost preflight; used as the brief's primary choice for this asset).

### Optimization

Same `sharp` pattern as the card pipeline above, with per-asset target dimensions: `768×1024` for
the 3:4 assets (card-back, completion-artifact) and `1600×900` for the 16:9 assets
(terminal-banner, share-card). All four cleared their size budget (≤150KB / ≤200KB respectively)
at `quality: 82` on the first pass — no further quality reduction was needed.
