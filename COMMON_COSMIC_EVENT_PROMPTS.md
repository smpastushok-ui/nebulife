# Common Cosmic Event Prompts - Approval Draft

Purpose: approval list for pre-generating all `common` cosmic event images through Higgsfield Nano Banana 2.

Target generation settings:
- Model: Nano Banana 2
- Resolution: 2K
- Aspect ratio: 9:16 vertical
- Output use: in-game bundled common event art
- Style baseline: cinematic NASA/JWST-inspired astrophotography, scientifically plausible, deep-space palette, high contrast, mobile-safe composition
- Negative constraints for every prompt: no text, no letters, no UI, no watermark, no logos, no people, no spacecraft, no fantasy symbols, no cartoon style

Implementation intent after approval:
- `common` cosmic event images become bundled/free for players.
- Non-common events remain paid by quarks or rewarded-ad unlock for Tier-1, as currently intended.
- Alpha promo reminder keeps the random video selection logic already planned.

## Common Event List

Total: 19 events from `packages/core/src/game/cosmic-catalog.ts`.

| ID | UA | EN | Category | Gallery |
|---|---|---|---|---|
| `white-dwarf` | Білий карлик | White Dwarf | stars | cosmos |
| `brown-dwarf` | Коричневий карлик | Brown Dwarf | stars | cosmos |
| `red-dwarf` | Червоний карлик | Red Dwarf | stars | cosmos |
| `flare-star` | Спалахуюча зірка | Flare Star | stars | cosmos |
| `lenticular-galaxy` | Лінзоподібна галактика | Lenticular Galaxy | galaxies | cosmos |
| `irregular-galaxy` | Неправильна галактика | Irregular Galaxy | galaxies | cosmos |
| `dwarf-galaxy` | Карликова галактика | Dwarf Galaxy | galaxies | cosmos |
| `stellar-flare` | Зоряний спалах | Stellar Flare | phenomena | anomalies |
| `bow-shock` | Головна ударна хвиля | Bow Shock | phenomena | anomalies |
| `super-earth` | Суперземля | Super-Earth | exotic-planets | landscapes |
| `sub-neptune` | Міні-Нептун | Sub-Neptune | exotic-planets | cosmos |
| `molecular-cloud` | Молекулярна хмара | Molecular Cloud | star-forming | cosmos |
| `open-cluster` | Розсіяне скупчення | Open Star Cluster | star-forming | cosmos |
| `eclipsing-binary` | Затемнювана подвійна | Eclipsing Binary | binaries | cosmos |
| `spectroscopic-binary` | Спектроскопічна подвійна | Spectroscopic Binary | binaries | cosmos |
| `comet` | Комета | Comet | small-bodies | cosmos |
| `asteroid-belt` | Пояс астероїдів | Asteroid Belt | small-bodies | cosmos |
| `l-type-brown-dwarf` | Коричневий карлик типу L | L-type Brown Dwarf | rogues | cosmos |
| `t-type-brown-dwarf` | Коричневий карлик типу T | T-type Brown Dwarf | rogues | cosmos |

## Prompt Pack

### 1. `white-dwarf` - White Dwarf

```text
Vertical 9:16 2K cinematic astrophotography of a small but intensely bright white dwarf star, compact Earth-sized stellar remnant with a sharp blue-white core, faint cooling glow, subtle gravitational lensing shimmer, fading wisps of an old planetary nebula in the background, dense starfield, dark cosmic blues and muted cyan highlights, scientifically plausible scale, dramatic mobile composition, NASA/JWST inspired realism, ultra-detailed plasma glow and dust, no text, no UI, no watermark, no logos, no people, no spacecraft, no cartoon style
```

### 2. `brown-dwarf` - Brown Dwarf

```text
Vertical 9:16 2K cinematic astrophotography of a dim brown dwarf, substellar object between planet and star, faint reddish-magenta thermal glow, turbulent atmospheric banding like a massive gas giant, methane and water vapor cloud structures, subtle storm systems across the surface, deep black interstellar background, soft infrared-like illumination, scientifically plausible, NASA/JWST inspired realism, high contrast mobile composition, no text, no UI, no watermark, no logos, no people, no spacecraft, no cartoon style
```

### 3. `red-dwarf` - Red Dwarf

```text
Vertical 9:16 2K cinematic astrophotography of a small red dwarf star, cool crimson photosphere, dark starspots, gentle granular surface texture, faint coronal glow, tiny scale emphasized by distant background stars, muted red and deep-space blue palette, subtle stellar flare traces but not explosive, scientifically plausible, NASA/JWST inspired realism, centered mobile composition with strong silhouette, no text, no UI, no watermark, no logos, no people, no spacecraft, no cartoon style
```

### 4. `flare-star` - Flare Star

```text
Vertical 9:16 2K cinematic astrophotography of a red dwarf flare star during a powerful magnetic eruption, dim crimson star surface with a huge white-hot flare loop bursting from one limb, coronal mass ejection arc glowing orange and violet, plasma streamers following magnetic field lines, dramatic but scientifically plausible, dark surrounding starfield, high contrast mobile composition, NASA/JWST inspired realism, no text, no UI, no watermark, no logos, no people, no spacecraft, no cartoon style
```

### 5. `lenticular-galaxy` - Lenticular Galaxy

```text
Vertical 9:16 2K cinematic astrophotography of a lenticular galaxy, smooth disk and bright central bulge with no spiral arms, subtle dust lanes crossing the disk, old golden stellar population, faint halo fading into deep space, distant background galaxies, elegant symmetrical S0 galaxy profile, scientifically plausible, NASA/Hubble inspired realism, dark cosmic palette with muted gold highlights, mobile poster composition, no text, no UI, no watermark, no logos, no people, no spacecraft, no cartoon style
```

### 6. `irregular-galaxy` - Irregular Galaxy

```text
Vertical 9:16 2K cinematic astrophotography of an irregular galaxy with chaotic asymmetric structure, scattered blue star-forming knots, pink hydrogen regions, dusty gas clouds, no clear spiral arms or elliptical form, rich textured starfield behind it, natural gravitationally disturbed shape, scientifically plausible, NASA/Hubble inspired realism, deep-space blacks with blue and magenta accents, strong mobile vertical framing, no text, no UI, no watermark, no logos, no people, no spacecraft, no cartoon style
```

### 7. `dwarf-galaxy` - Dwarf Galaxy

```text
Vertical 9:16 2K cinematic astrophotography of a small dwarf galaxy, diffuse low-surface-brightness stellar cloud, scattered old stars with a few bright blue star-forming regions, faint uneven halo, visible against a background of distant galaxies, humble scale but rich detail, scientifically plausible, NASA/Hubble inspired realism, muted blues and soft golds on dark space, mobile-safe centered composition, no text, no UI, no watermark, no logos, no people, no spacecraft, no cartoon style
```

### 8. `stellar-flare` - Stellar Flare

```text
Vertical 9:16 2K cinematic astrophotography of a massive stellar flare erupting from the surface of a sun-like star, brilliant white-hot magnetic reconnection flash, looping arcs of plasma, coronal mass ejection expanding into space, granular photosphere visible below, intense orange-gold and white light against black space, scientifically plausible solar physics, NASA/SDO inspired realism, dramatic vertical mobile composition, no text, no UI, no watermark, no logos, no people, no spacecraft, no cartoon style
```

### 9. `bow-shock` - Bow Shock

```text
Vertical 9:16 2K cinematic astrophotography of a stellar bow shock, fast-moving star plowing through the interstellar medium, luminous crescent-shaped shock front ahead of the star, compressed glowing gas arc, trailing wake of heated material behind it, subtle dust and plasma texture, dark starfield, scientifically plausible, NASA/Spitzer infrared inspired realism, strong crescent shape filling the vertical frame, no text, no UI, no watermark, no logos, no people, no spacecraft, no cartoon style
```

### 10. `super-earth` - Super-Earth

```text
Vertical 9:16 2K cinematic orbital astrophotography of a super-Earth exoplanet, rocky world larger than Earth with a thick atmosphere, visible tectonic scars, volcanic regions, possible oceans and rugged continents, bright limb glow and cloud bands, nearby star reflected softly on the atmosphere, scientifically plausible exoplanet view, NASA concept-art realism, deep space background, premium mobile card composition, no text, no UI, no watermark, no logos, no people, no spacecraft, no cartoon style
```

### 11. `sub-neptune` - Sub-Neptune

```text
Vertical 9:16 2K cinematic astrophotography of a sub-Neptune exoplanet, intermediate world between rocky planet and ice giant, thick hydrogen-helium atmosphere, muted blue-gray and teal atmospheric bands, hazy upper clouds, rocky core implied beneath the gas envelope, soft terminator shadow, distant star illumination, scientifically plausible, NASA exoplanet realism, elegant mobile vertical composition, no text, no UI, no watermark, no logos, no people, no spacecraft, no cartoon style
```

### 12. `molecular-cloud` - Molecular Cloud

```text
Vertical 9:16 2K cinematic astrophotography of a giant molecular cloud, cold dark hydrogen and dust complex silhouetted against a dense starfield, embedded protostars glowing faintly through the dust in infrared-like reds, subtle filaments and opaque tendrils, background stars reddened at the cloud edges, scientifically plausible stellar nursery, NASA/JWST inspired realism, dark cosmic palette, no text, no UI, no watermark, no logos, no people, no spacecraft, no cartoon style
```

### 13. `open-cluster` - Open Star Cluster

```text
Vertical 9:16 2K cinematic astrophotography of a young open star cluster, dozens to hundreds of bright blue-white stars born from the same cloud, loose grouping with subtle remaining nebulosity, faint dust veil around the brightest members, varied stellar brightness and color, scientifically plausible, Pleiades-like but original, NASA/Hubble inspired realism, deep black space with cool blue highlights, mobile-friendly depth composition, no text, no UI, no watermark, no logos, no people, no spacecraft, no cartoon style
```

### 14. `eclipsing-binary` - Eclipsing Binary

```text
Vertical 9:16 2K cinematic astrophotography of an eclipsing binary star system, two stars in close orbit with one partially blocking the other from our viewpoint, different sizes and colors, visible shared orbital plane, soft overlapping halos, subtle brightness dip effect, scientifically plausible binary geometry, dark starfield, NASA realism, dramatic centered vertical composition, no text, no UI, no watermark, no logos, no people, no spacecraft, no cartoon style
```

### 15. `spectroscopic-binary` - Spectroscopic Binary

```text
Vertical 9:16 2K cinematic scientific astrophotography of a close spectroscopic binary, two stars orbiting so tightly they visually merge into one bright point, faint suggestion of twin stellar cores inside a shared glow, subtle red and blue Doppler-shifted light trails around the system, spectral-line inspired color accents without any text or graph marks, scientifically plausible, NASA realism, dark cosmic background, mobile vertical framing, no text, no UI, no watermark, no logos, no people, no spacecraft, no cartoon style
```

### 16. `comet` - Comet

```text
Vertical 9:16 2K cinematic astrophotography of a comet near perihelion, bright icy nucleus with glowing coma, long curved golden dust tail and straighter blue ion tail stretching across the vertical frame, jets of gas erupting from the nucleus, nearby star off-frame illuminating the scene, dark starfield, scientifically plausible comet physics, NASA realism, strong mobile poster composition, no text, no UI, no watermark, no logos, no people, no spacecraft, no cartoon style
```

### 17. `asteroid-belt` - Asteroid Belt

```text
Vertical 9:16 2K cinematic astrophotography of an asteroid belt around a distant star, thousands of rocky and metallic bodies scattered in a broad orbital ring, foreground cratered asteroid with smaller fragments receding into depth, warm starlight catching rough mineral surfaces, realistic spacing with vast empty space, scientifically plausible, NASA concept realism, deep-space background, mobile vertical depth composition, no text, no UI, no watermark, no logos, no people, no spacecraft, no cartoon style
```

### 18. `l-type-brown-dwarf` - L-type Brown Dwarf

```text
Vertical 9:16 2K cinematic astrophotography of an L-type brown dwarf, dark reddish-magenta substellar glow, thick atmospheric cloud bands made of iron droplets and silicate dust, turbulent storm systems visible across the surface, faint thermal emission against interstellar darkness, scientifically plausible infrared-inspired view, NASA realism, muted crimson and bronze palette, mobile-safe centered composition, no text, no UI, no watermark, no logos, no people, no spacecraft, no cartoon style
```

### 19. `t-type-brown-dwarf` - T-type Brown Dwarf

```text
Vertical 9:16 2K cinematic astrophotography of a T-type brown dwarf, cool methane-rich atmosphere, Jupiter-like but self-luminous, alternating bright and dark atmospheric bands, subtle bluish-gray and deep violet thermal glow, faint infrared aura, isolated in dark interstellar space with distant stars, scientifically plausible, NASA realism, calm mysterious mobile composition, no text, no UI, no watermark, no logos, no people, no spacecraft, no cartoon style
```
