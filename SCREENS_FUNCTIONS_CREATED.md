# Nebulife Session — Screens & Functions Created

**Date**: 2026-03-12 | **Commit**: `7de6299`

---

## 🖼️ New Screens

### 1. **PlanetDetailWindow** — Full-screen planet inspector

**File**: `packages/client/src/ui/components/PlanetDetailWindow.tsx` (NEW)

**Purpose**: Display complete planet characteristics with PixiJS visualization and interactive navigation.

#### Props
```typescript
interface PlanetDetailWindowProps {
  system: StarSystem;          // Star system containing the planet
  systemDisplayName?: string;  // Display name (e.g., "Kepler-442 System")
  initialPlanetIndex: number;  // Which planet to show first
  onClose: () => void;         // Callback when user closes (Escape or close button)
}
```

#### Features
- **PixiJS Canvas**: Renders planet with clouds + moons in orbit with Y-compression (0.35)
- **Log-scale Sizing**: Min 9% → Max 32% of canvas height for fair visual comparison
- **Circular Navigation**: Prev/Next buttons loop through system planets
- **Keyboard Shortcuts**:
  - `← / →` — Previous/next planet
  - `Esc` — Close window
- **Characteristics Panels**: 7 sections with staggered fade-in animations
  1. **Physical**: Type, radius, mass, density
  2. **Thermal**: Surface temp, equilibrium temp, greenhouse effect
  3. **Orbital**: Semi-major axis, eccentricity, orbital period, insolation flux
  4. **Atmospheric**: Pressure, mass, composition (top 3)
  5. **Hydrological**: Water surface %, oceans, ice caps, vapor pressure
  6. **Habitability**: Temperature, atmosphere, water, magnetic field, gravity, overall score
  7. **Biological**: Life presence (if applicable)

#### Internal Structure
```typescript
// Log-scale display radius calculation
const getPlanetDisplayRadius = (): number => {
  const minR = screenHeight * 0.09;
  const maxR = screenHeight * 0.32;
  const t = (radius - minRadius) / (maxRadius - minRadius);
  return minR + Math.log(1 + t * (Math.E - 1)) * (maxR - minR);
};

// PixiJS canvas rendering inside PlanetCanvas component
const renderPlanetCloseup = (
  gfx: Graphics,
  planet: Planet,
  displayRadius: number
): void => {
  // Draws planet circle + cloud drift animation
  // Called each RAF frame to update cloud position
};

// Moon rendering with Y-compression and depth ordering
const renderMoon = (
  gfx: Graphics,
  moon: Moon,
  parentRadius: number,
  time: number
): void => {
  // Draws moon at orbital position with depth-based Z-order
  // Y compressed by 0.35 for flat appearance
};
```

#### Animations
- **Entry**: Scale 0.98 → 1 over 200ms
- **Cloud Drift**: Horizontal scroll loop (continuously)
- **Moon Orbits**: Sinusoidal motion with time-based position
- **Characteristic Rows**: Fade-in with delays (40ms each, up to 700ms)

#### State Management
```typescript
const [planetIndex, setPlanetIndex] = useState(initialPlanetIndex);
const [entryScale, setEntryScale] = useState(0.98);
```

#### User Journey
1. User clicks eye icon in SystemObjectsPanel for a planet
2. App calls `handleViewPlanetDetail(system, index)`
3. PlanetDetailWindow mounts with that planet visible
4. User can navigate with buttons/keyboard, inspect all characteristics
5. Close via button/Escape, returns to system view

---

## 🎬 New Visualization System

### 2. **Quantum Scanning Overlay** — Planet scanning effects

**Files**:
- `packages/client/src/game/scenes/HomePlanetScene.ts` (existing, working baseline)
- `packages/client/src/game/scenes/PlanetViewScene.ts` (NEW identical implementation)

**Purpose**: Visualize AI 3D model generation with sci-fi scanning effects directly on the PixiJS planet.

#### Core Methods

##### `startScanning(): void`
Creates the scanning overlay container and begins animation loop.
```typescript
// Initializes scanContainer with all rendering layers
scanContainer = new Container();
scanGfx = new Graphics();
scanContainer.addChild(scanGfx);
this.container.addChild(scanContainer);
scanActive = true;
```

##### `stopScanning(): void`
Destroys the overlay and stops animation.
```typescript
scanGfx?.clear();
scanContainer?.removeChild(scanGfx);
this.container.removeChild(scanContainer);
scanActive = false;
```

##### `updateScanProgress(progress: number): void`
Updates the progress arc (0-100%).
```typescript
scanProgress = Math.max(0, Math.min(100, progress));
// Redrawn on next frame
```

#### Visual Elements

**A) Wireframe Grid**
- **Latitude lines**: 5 horizontal circles (different latitudes)
- **Longitude lines**: 6 half-ellipses (meridians)
- **Colors**: `0x44ffaa` (green), alpha 0.15-0.3
- **Animation**: 0.0003 rad/ms rotation
- **Logic**:
  ```typescript
  // Latitude circle at latitude `lat` on sphere with radius R
  const y_center = R * Math.sin(lat);
  const r_circle = R * Math.cos(lat);
  // Draw circle at (centerX, centerY + y_center) with radius r_circle

  // Longitude ellipse at angle `lonAngle`
  const rx = R * Math.sin(lonAngle);
  const ry = R;
  // Draw half-ellipse (top to bottom)
  ```

**B) Lidar Beam**
- **Type**: Rotating sweep line from center to edge
- **Revolution**: ~4.2 seconds per full rotation
- **Trail**: 60° arc of fading segments behind the beam
- **Styling**: Line (width 2, alpha 0.6) + glow (width 6, alpha 0.1)
- **Color**: `0x44ff88` (bright green)

**C) HUD Data Rings**
- **Inner Ring**: `R * 1.15`, 24 segments, rotates CW (~0.0002 rad/ms)
- **Outer Ring**: `R * 1.35`, 36 segments, rotates CCW (~-0.0002 rad/ms)
- **Color**: `0x4488aa` (blue), alpha 0.2-0.4
- **Details**: Small rectangular "data" markers every 30°

**D) Progress Arc**
- **Radius**: `R * 1.5`
- **Range**: -π/2 to `scanProgress/100 * 2π`
- **Color**: `0x44ff88`, alpha 0.5
- **Purpose**: Visual progress bar during model generation

#### Update Loop Integration
```typescript
update(deltaMs: number) {
  // ... existing code ...

  // Step 5: Scanning overlay animation
  if (this.scanActive && this.scanGfx) {
    this.scanTime += deltaMs;
    this.redrawScanOverlay();
  }
}
```

---

## 🎯 New State Machine Functions

### 3. **App.tsx — 3D Generation Handlers**

**File**: `packages/client/src/App.tsx`

#### New State
```typescript
// Home screen 3D generation (previously implemented)
const [home3DPhase, setHome3DPhase] = useState<
  'idle' | 'paying' | 'scanning' | 'materializing' | 'complete'
>('idle');
const [home3DProgress, setHome3DProgress] = useState(0);
const [home3DGenPhase, setHome3DGenPhase] = useState<'generating_photo' | 'generating_3d'>('generating_photo');

// Planet-view 3D generation (NEW — mirrors home3DPhase)
const [planetView3DPhase, setPlanetView3DPhase] = useState<
  'idle' | 'paying' | 'scanning' | 'materializing' | 'complete'
>('idle');
const [planetView3DProgress, setPlanetView3DProgress] = useState(0);
const [planetView3DGenPhase, setPlanetView3DGenPhase] = useState<'generating_photo' | 'generating_3d'>('generating_photo');

// Planet detail window navigation
const [planetDetailTarget, setPlanetDetailTarget] = useState<{
  system: StarSystem;
  planetIndex: number;
  displayName?: string;
} | null>(null);
```

#### Handler: `handleHome3DGenerate()`
Initiates home planet 3D model generation with full scanning → materialization flow.

**Flow**:
```
1. setHome3DPhase('paying')
   ↓
2. User completes payment → receives modelId
   ↓
3. engineRef.current?.startHomeScanning()
4. setHome3DPhase('scanning')
   ↓
5. Poll modelStatus until complete
   - Update progress: setHome3DProgress(status.progress)
   - Notify engine: engineRef.current?.updateHomeScanProgress(progress)
   - Switch phases: 'generating_photo' → 'generating_3d'
   ↓
6. Model ready → engineRef.current?.stopHomeScanning()
7. setHome3DPhase('materializing')
   ↓
8. handleModelReady() → triggers backgroundModelInfo state
9. HolographicTransition begins (clip-path wipe 2D→3D)
   ↓
10. Wipe completes → setHome3DPhase('complete')
11. PixiJS hidden, 3D model visible
```

**Signature**:
```typescript
const handleHome3DGenerate = useCallback(async () => {
  // Requires: homeInfo (home planet data)
  // Sets: home3DPhase, home3DProgress, home3DGenPhase
  // Calls: engineRef.current.startHomeScanning/stopHomeScanning/updateHomeScanProgress
  // Calls: handleModelReady (triggers backgroundModelInfo)
  // Calls: refreshQuarks (if paid with quarks)
}, [homeInfo, refreshQuarks, handleModelReady]);
```

#### Handler: `handlePlanetView3DGenerate()`
Identical flow to home 3D, but operates on `planetView3DPhase`.

**Differences from home version**:
- Uses `planetView3DPhase`, `planetView3DProgress`, `planetView3DGenPhase`
- Calls `engineRef.current?.startPlanetViewScanning()`
- Calls `engineRef.current?.updatePlanetViewScanProgress(progress)`
- Calls `engineRef.current?.stopPlanetViewScanning()`
- Requires: `state.selectedPlanet` and `state.selectedSystem`

**Signature**:
```typescript
const handlePlanetView3DGenerate = useCallback(async () => {
  // Requires: state.selectedPlanet, state.selectedSystem
  // Sets: planetView3DPhase, planetView3DProgress, planetView3DGenPhase
  // Calls: engineRef.current.startPlanetViewScanning/stopPlanetViewScanning/updatePlanetViewScanProgress
  // Calls: handleModelReady
  // Calls: refreshQuarks
}, [state.selectedPlanet, state.selectedSystem, refreshQuarks, handleModelReady]);
```

#### Handler: `handleViewPlanetDetail()`
Opens the PlanetDetailWindow for inspection.

**Signature**:
```typescript
const handleViewPlanetDetail = useCallback(
  (system: StarSystem, planetIndex: number, displayName?: string) => {
    setPlanetDetailTarget({ system, planetIndex, displayName });
  },
  []
);
```

**Usage from SystemObjectsPanel**:
```typescript
<SystemObjectsPanel
  system={objectsPanelSystem}
  onViewPlanet={(idx) => handleViewPlanetDetail(
    objectsPanelSystem,
    idx,
    objectsPanelSystem.displayName
  )}
/>
```

---

## 🔧 New Engine Methods

### 4. **GameEngine.ts — Scanning Control**

**File**: `packages/client/src/game/GameEngine.ts`

#### Method: `startPlanetViewScanning()`
Activates the quantum scanning overlay on the current planet view scene.

```typescript
startPlanetViewScanning() {
  this.planetViewScene?.startScanning();
}
```

#### Method: `stopPlanetViewScanning()`
Deactivates the quantum scanning overlay.

```typescript
stopPlanetViewScanning() {
  this.planetViewScene?.stopScanning();
}
```

#### Method: `updatePlanetViewScanProgress(progress: number)`
Updates the progress arc (0-100%) shown during model generation.

```typescript
updatePlanetViewScanProgress(progress: number) {
  this.planetViewScene?.updateScanProgress(progress);
}
```

(Similar methods exist for home planet: `startHomeScanning`, `stopHomeScanning`, `updateHomeScanProgress`)

---

## 🎨 UI Component Enhancements

### 5. **SystemObjectsPanel.tsx — Eye Icon & Dividers**

**File**: `packages/client/src/ui/components/SystemObjectsPanel.tsx`

#### New Prop
```typescript
onViewPlanet?: (planetIndex: number) => void;
```

#### New Sub-component: `EyeIcon`
```typescript
const EyeIcon = () => (
  <svg viewBox="0 0 18 12" width="18" height="12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M9 1C5 1 1.73 3.61 1 7.5c.73 3.89 4 6.5 8 6.5s7.27-2.61 8-6.5C16.27 3.61 12.73 1 9 1zm0 5c.83 0 1.5.67 1.5 1.5S9.83 9 9 9s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z"
      fill="currentColor"
    />
    <circle cx="9" cy="7.5" r="0.6" fill="currentColor" />
  </svg>
);
```

#### Column Divider Style
```typescript
const divStyle = {
  borderRight: '1px solid rgba(40,58,80,0.55)',
  paddingRight: 8,
  marginRight: 4,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
};
```

#### Modified Table Structure
- All table cells wrapped with `divStyle` for visual column separation
- New column added with moon count + eye button
- Panel width increased: 420px → 490px

#### Moon Count + Eye Button
```typescript
{onViewPlanet && (
  <div style={divStyle}>
    <button
      onClick={() => onViewPlanet(index)}
      style={{
        background: 'none',
        border: 'none',
        color: '#8899aa',
        cursor: 'pointer',
        padding: 4,
        display: 'flex',
        alignItems: 'center',
      }}
      title={`View ${planet.name} details`}
    >
      <EyeIcon />
    </button>
  </div>
)}
```

---

## 📡 API & Server Functions

### 6. **gemini-client.ts — Model Configuration**

**File**: `packages/server/src/gemini-client.ts`

#### Model & Config Changes
```typescript
// OLD: Not found in API
const GEMINI_MODEL = 'gemini-2.0-flash-preview-image-generation'; // 404 error

// NEW: Stable, latest
const GEMINI_MODEL = 'gemini-3.1-flash-image-preview';

// In generateImageWithGemini()
const response = await ai.models.generateContent({
  model: GEMINI_MODEL,
  contents: req.prompt,
  config: {
    thinkingConfig: { thinkingBudget: 0 },  // DISABLED — no chain-of-thought
    responseModalities: ['IMAGE', 'TEXT'],
    imageConfig: {
      aspectRatio: aspectRatio,
      imageSize: '2K',  // 2048px quality (vs default 1K)
    },
  },
});
```

#### Why These Changes
- **Model**: `gemini-3.1-flash-image-preview` is stable and actively supported
- **thinkingBudget: 0**: Disables chain-of-thought reasoning (no overhead for image generation)
- **imageSize: '2K'**: Generates 2048px output for higher visual quality

---

### 7. **system-photo-prompt-builder.ts — Structured Catalog**

**File**: `packages/server/src/system-photo-prompt-builder.ts`

#### New Prompt Structure
```typescript
export function buildGeminiSystemPhotoPrompt(system: StarSystem): string {
  // SECTION 1: System Catalog (scientific data)
  const starCatalog = [
    `SYSTEM CATALOG:`,
    `Star: ${star.name}, spectral class ${star.spectralClass}${star.subType}V,`,
    `temperature ${Math.round(star.temperatureK)}K, mass ${star.massSolar.toFixed(2)} M☉,`,
    `radius ${star.radiusSolar.toFixed(2)} R☉, luminosity class ${starColor}.`,
  ].join(' ');

  // Per-planet catalog with composition inferred from type
  const planetCatalog = sortedPlanets.map((p, i) => {
    let composition: string;
    if (p.type === 'gas-giant') composition = 'hydrogen-helium gas giant';
    else if (p.type === 'ice-giant') composition = 'water-methane-ammonia ice giant';
    // ... infer from type ...

    const moonList = p.moons.length > 0
      ? p.moons.map(m => `${m.name} (${m.compositionType}, radius ${Math.round(m.radiusKm)}km, orbit ${Math.round(m.orbitalRadiusKm)}km)`)
      : 'none';

    return [
      `Planet ${i + 1}: ${p.name},`,
      `type=${p.type}, composition=${composition},`,
      `radius=${p.radiusEarth.toFixed(2)} Earth radii, mass=${p.massEarth.toFixed(3)} Earth masses,`,
      `orbit=${p.orbit.semiMajorAxisAU.toFixed(3)}AU,`,
      `surface temp=${Math.round(p.surfaceTempK)}K,`,
      `Moons: ${moonList}.`,
    ].join(' ');
  }).join(' ');

  // SECTION 2: Cinematic description (per spectral class)
  const cinematicDir = getCinematicDirection(star.spectralClass);

  // Compose final prompt
  return [
    starCatalog,
    planetCatalog,
    `---`,  // Separator
    `A breathtaking deep space photograph...`,
    // ... rest of description ...
  ].join(' ');
}

// New helper: Cinematic direction tuned per spectral class
function getCinematicDirection(spectralClass: SpectralClass): string {
  switch (spectralClass) {
    case 'O':
    case 'B':
      return 'The scene is bathed in intense blue-violet stellar radiation...';
    case 'A':
      return 'The starlight is crisp and white, illuminating sharp details...';
    // ... more classes ...
  }
}
```

#### Catalog Content
**Star Section**:
- Name, spectral class, temperature (K), mass (M☉), radius (R☉), luminosity class

**Planets Section** (per planet):
- Name, type, composition (inferred), radius (R⊕), mass (M⊕), orbit distance (AU), surface temp (K)
- Moon list with composition type, radius, orbital radius

**Cinematic Section**:
- Separator `---`
- Per-class lighting descriptions (O/B = blue-violet, A = crisp white, F = yellow, etc.)

---

## 🔄 User Interaction Flows

### Flow 1: Eye Icon → Planet Detail Window

```
SystemObjectsPanel (moon count + eye icon)
    ↓
User clicks eye icon for Planet #3
    ↓
onViewPlanet(3) callback
    ↓
App.handleViewPlanetDetail(system, 3, displayName)
    ↓
setPlanetDetailTarget({ system, planetIndex: 3, displayName })
    ↓
PlanetDetailWindow renders with Planet #3 visible
    ↓
User can:
  - Click Prev/Next to navigate other planets (circular)
  - Press ← / → / Esc for keyboard navigation
  - Inspect all 7 characteristic panels
    ↓
User clicks close / presses Escape
    ↓
App.setPlanetDetailTarget(null)
    ↓
PlanetDetailWindow unmounts, back to system view
```

### Flow 2: 3D Generation → Scanning → Materialization

```
CommandBar: "3D 49⚛" button (planet-view)
    ↓
User clicks
    ↓
App.handlePlanetView3DGenerate()
    ↓
planetView3DPhase = 'paying'
    ↓
User completes payment flow
    ↓
planetView3DPhase = 'scanning'
engineRef.startPlanetViewScanning()
    ↓
[QuantumScanTerminal shows "SCANNING..." logs]
[PlanetViewScene renders wireframe grid, lidar beam, HUD rings, progress arc]
    ↓
Poll modelStatus every 1s:
  - Update planetView3DProgress
  - Call updatePlanetViewScanProgress(progress)
  - Switch phases: 'generating_photo' → 'generating_3d'
    ↓
Model complete (status.status === 'succeed')
    ↓
engineRef.stopPlanetViewScanning()
    ↓
planetView3DPhase = 'materializing'
handleModelReady(modelId, glbUrl) → backgroundModelInfo state
    ↓
[QuantumScanTerminal hidden]
[HolographicTransition appears over PlanetViewScene]
[Clip-path wipe: 100% → 0% top-to-bottom over 2.5s]
[Laser line moves with clip boundary]
    ↓
Wipe complete → Flash effect (white overlay 0.3s)
    ↓
planetView3DPhase = 'complete'
[PlanetViewScene hidden]
[3D model (Three.js) visible]
    ↓
User can rotate/inspect 3D model or navigate away
```

---

## 🚀 Quick Reference: Functions & Methods

### Screen Components
| Component | File | Purpose |
|-----------|------|---------|
| **PlanetDetailWindow** | NEW | Full-screen planet inspector with PixiJS render + characteristics |

### State Management (App.tsx)
| State | Type | Purpose |
|-------|------|---------|
| `planetView3DPhase` | `'idle'\|'paying'\|'scanning'\|'materializing'\|'complete'` | Planet-view 3D generation phase |
| `planetView3DProgress` | `number` (0-100) | Model generation progress % |
| `planetView3DGenPhase` | `'generating_photo'\|'generating_3d'` | Gemini phase (photo first, then 3D) |
| `planetDetailTarget` | `{system, planetIndex, displayName?}\|null` | PlanetDetailWindow state |

### Handlers (App.tsx)
| Handler | Signature | Purpose |
|---------|-----------|---------|
| `handlePlanetView3DGenerate` | `async () => void` | Initiates planet-view 3D generation |
| `handleViewPlanetDetail` | `(system, planetIndex, displayName?) => void` | Opens PlanetDetailWindow |

### Engine Methods (GameEngine.ts)
| Method | Signature | Purpose |
|--------|-----------|---------|
| `startPlanetViewScanning` | `() => void` | Activate scanning overlay on planet-view |
| `stopPlanetViewScanning` | `() => void` | Deactivate scanning overlay |
| `updatePlanetViewScanProgress` | `(progress: number) => void` | Update progress arc (0-100) |

### Scene Methods (PlanetViewScene.ts)
| Method | Signature | Purpose |
|--------|-----------|---------|
| `startScanning` | `() => void` | Create & show scanning container |
| `stopScanning` | `() => void` | Destroy scanning container |
| `updateScanProgress` | `(progress: number) => void` | Update progress arc |

### API Functions (gemini-client.ts)
| Function | Model | Config |
|----------|-------|--------|
| `generateImageWithGemini` | `gemini-3.1-flash-image-preview` | `thinkingBudget: 0`, `imageSize: '2K'` |

---

## 📊 Metrics

| Metric | Value |
|--------|-------|
| New screens created | 1 (PlanetDetailWindow) |
| New state additions | 4 (planetView3DPhase, planetView3DProgress, planetView3DGenPhase, planetDetailTarget) |
| New handlers | 2 (handlePlanetView3DGenerate, handleViewPlanetDetail) |
| New engine methods | 3 (startPlanetViewScanning, stopPlanetViewScanning, updatePlanetViewScanProgress) |
| New scene methods | 3 (startScanning, stopScanning, updateScanProgress on PlanetViewScene) |
| Lines added (PlanetDetailWindow alone) | ~700 |
| Lines added (PlanetViewScene scanning) | ~380 |
| Total files modified | 6 |

---

## ✅ Integration Checklist

- [x] PlanetDetailWindow displays planet with moons
- [x] Navigation works (Prev/Next buttons, keyboard, circular)
- [x] All 7 characteristic panels render correctly
- [x] Atmosphere composition fixed (Record<string, number> handling)
- [x] HabitabilityFactors.magneticField properly referenced
- [x] Eye icon in SystemObjectsPanel opens detail window
- [x] Planet-view scanning overlay renders (wireframe, lidar, HUD, progress)
- [x] Scanning progress updates during model generation
- [x] Holographic materialization plays after scanning
- [x] Gemini model changed to `gemini-3.1-flash-image-preview`
- [x] Structured system catalog added to prompt
- [x] All TypeScript errors resolved
- [x] Build succeeds, no warnings

---

**Created by**: Claude Code (Haiku 4.5) | **Session**: 2026-03-12
