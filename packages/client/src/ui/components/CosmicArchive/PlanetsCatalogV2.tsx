import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { StarSystem, Planet, PlanetResourceStocks } from '@nebulife/core';
import type { PlanetTerraformState, TerraformParamId, TechTreeState } from '@nebulife/core';
import {
  isTerraformable,
  nearestColonyDistance,
  getOverallProgress,
  canStartParam,
  computeParamRequirement,
  tierForBuildings,
  generatePlanetStocks,
} from '@nebulife/core';
import type { ColonyResources } from '../Terraform/MissionDispatchModal.js';
import type { PlacedBuilding } from '@nebulife/core';
import { ResourceIcon, RESOURCE_COLORS } from '../ResourceIcon.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterId =
  | 'terraform'
  | 'minerals'
  | 'isotopes'
  | 'water'
  | 'life'
  | 'volatiles'
  | 'population';

interface PlanetsCatalogV2Props {
  allSystems: StarSystem[];
  aliases: Record<string, string>;
  onViewPlanet: (system: StarSystem, planetId: string) => void;
  /** Planet IDs that have a colony (home planet + colony_hub buildings). */
  colonyPlanetIds: Set<string>;
  /** System IDs that contain colony planets — used as "nearest colony" origins. */
  colonySystemIds: string[];
  /** Optional terraforming state per planet ID — used for filter value display. */
  terraformStates?: Record<string, PlanetTerraformState>;
  /** Optional surface navigation callback — opens surface for a planet. */
  onOpenSurface?: (system: StarSystem, planetId: string) => void;
  /** Optional favorites toggle callback. */
  onToggleFavorite?: (planetId: string) => void;
  /** Set of currently favorited planet IDs. */
  favoritePlanetIds?: Set<string>;
  /** Per-planet resource getter — used by the detail panel stock rows. */
  getPlanetResources?: (planetId: string) => ColonyResources;
  /**
   * Opens MissionDispatchModal for the given target planet + paramId.
   * Parent (CosmicArchive → App) should close catalog and wire onStartParam.
   */
  onSendTerraformDelivery?: (targetPlanet: Planet, paramId: TerraformParamId) => void;
  /** Manually trigger terraform completion for a planet that has reached >=95%. */
  onCompleteTerraform?: (planet: Planet) => void;
  /** Colony planets that can act as donors (for dispatch-gate check). */
  donorPlanets?: Planet[];
  /** Tech tree state for canStartParam gate checks. */
  techTreeState?: TechTreeState;
  /** Current buildings on the active colony surface (for ship-tier check). */
  colonyBuildings?: PlacedBuilding[];
  /** Callback to rename a planet (inline edit). Saved in planetOverrides. */
  onRenamePlanet?: (planetId: string, newName: string) => void;
  /**
   * Finite planet resource stocks (v168).
   * When provided, the detail panel shows stock units rather than colony inventory.
   */
  planetResourceStocks?: Record<string, PlanetResourceStocks>;
}

// ---------------------------------------------------------------------------
// Realistic planet color based on physical parameters
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// isEarthLike — terrestrial with significant water → uniform ocean+land look
// ---------------------------------------------------------------------------

function isEarthLike(planet: Planet): boolean {
  if (planet.isHomePlanet) return true;
  if (planet.type !== 'terrestrial') return false;
  const water = planet.hydrosphere?.waterCoverageFraction ?? (planet.habitability?.water ?? 0);
  return water > 0.3;
}

// ---------------------------------------------------------------------------
// toHex — convert rgb(r,g,b) components to #rrggbb hex string.
// All color branches must return hex so SVG stopColor suffixes like
// `${color}dd` and `${color}aa` remain valid CSS color values.
// ---------------------------------------------------------------------------
function toHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const h = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

// ---------------------------------------------------------------------------
// luminanceSafe — ensure returned color has perceived luminance >= 0.12
// (prevents near-black planets from being invisible on the dark background).
// ---------------------------------------------------------------------------
function luminanceSafe(hex: string): string {
  // Parse #rrggbb
  if (hex.length !== 7 || hex[0] !== '#') return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Relative luminance (sRGB, simplified)
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (lum < 0.12) return '#888777'; // fallback to neutral mid-gray
  return hex;
}

function getRealisticPlanetColor(planet: Planet): string {
  if (planet.isHomePlanet) return '#44ff88';

  // Earth-like planets use a fixed teal-blue tone (rendered with special SVG)
  if (isEarthLike(planet)) return '#2266aa';

  const tempK = planet.surfaceTempK ?? 300;
  const water = planet.hydrosphere?.waterCoverageFraction ?? (planet.habitability?.water ?? 0);
  const atmoP = planet.atmosphere?.surfacePressureAtm ?? 0;

  // Gas giants — from PlanetVisuals palette (seed-based bucket via simple modulo)
  if (planet.type === 'gas-giant') {
    if (tempK > 1000) {
      // hot gas giant — red/orange
      const reds = ['#cc5522', '#dd6633', '#ff8844', '#aa3322'];
      return reds[Math.abs(planet.seed ?? 0) % reds.length];
    }
    if (tempK > 400) {
      // warm gas giant — tan/amber
      const warms = ['#cc9955', '#ddbb77', '#eebb88', '#ccaa77'];
      return warms[Math.abs(planet.seed ?? 0) % warms.length];
    }
    // cold gas giant — brown/butterscotch
    const colds = ['#aa8855', '#ccaa77', '#998866', '#bb9977'];
    return colds[Math.abs(planet.seed ?? 0) % colds.length];
  }

  // Ice giants — blue/teal
  if (planet.type === 'ice-giant') {
    if (tempK > 200) {
      const teals = ['#5588aa', '#66aabb', '#77aacc', '#4488aa'];
      return teals[Math.abs(planet.seed ?? 0) % teals.length];
    }
    const navies = ['#3366aa', '#4477bb', '#2255aa', '#5577cc'];
    return navies[Math.abs(planet.seed ?? 0) % navies.length];
  }

  // Terrestrial / rocky / dwarf
  // Water coverage adds blue tones
  const waterFrac = Math.min(1, water);
  // Temperature: hot → reddish/yellow, cold → blue-gray, temperate → neutral
  const co2 = planet.atmosphere?.composition?.['CO2'] ?? 0;
  const isVenusLike = co2 > 0.5 && atmoP > 10;

  if (isVenusLike) return '#ccaa44'; // Venus-like: opaque yellow cloud cover

  if (tempK > 1200) return '#664422'; // lava world (never pure black)
  if (tempK > 600) return '#8a5533';  // scorched red-brown

  // Life-bearing terrestrial with significant water
  if (planet.hasLife && waterFrac > 0.3 && (planet.type === 'terrestrial' || planet.type === 'rocky')) {
    // Mix blue (water) with green (life) — returned as hex to allow alpha suffix in SVG
    const b = Math.round(80 + waterFrac * 80);
    const g = Math.round(120 + Math.min(70, waterFrac * 55));
    return luminanceSafe(toHex(40, g, b));
  }

  // Icy/frozen worlds
  if (tempK < 200) return '#6699bb';  // frozen — blue-gray
  if (tempK < 250) {
    // cold rocky with some ice — hex to allow alpha suffix in SVG
    const iceBlend = (250 - tempK) / 50;
    const r = Math.round(80 + (1 - iceBlend) * 40);
    const g = Math.round(115 + (1 - iceBlend) * 20);
    const b = Math.round(160 + iceBlend * 25);
    return luminanceSafe(toHex(r, g, b));
  }

  // Water-rich worlds (without life)
  if (waterFrac > 0.6) return '#2255aa'; // ocean world — deep blue
  if (waterFrac > 0.2) {
    // mix blue/brown — hex to allow alpha suffix in SVG
    const b = Math.round(80 + waterFrac * 80);
    return luminanceSafe(toHex(70, Math.round(95 + waterFrac * 35), b));
  }

  // Dry rocky worlds — temperature-based
  if (tempK > 373) return '#bb7733';  // warm desert
  if (tempK > 273) {
    // temperate rock — gray-brown with atmosphere tint — hex for SVG alpha compat
    const atmosBoost = atmoP > 0.5 ? 10 : 0;
    return luminanceSafe(toHex(110 + atmosBoost, 100 + atmosBoost, 88));
  }

  // Dwarf — pale, low color saturation
  if (planet.type === 'dwarf') return '#aaaa99';

  // Type-based fallbacks — NEVER return near-black
  if (planet.type === 'rocky') return '#888777';
  if (planet.type === 'terrestrial') return '#5588aa';

  return '#888777'; // default neutral
}

// Keep old function for backward compat — now delegates to realistic version
function getPlanetBodyColor(planet: Planet): string {
  return getRealisticPlanetColor(planet);
}

// ---------------------------------------------------------------------------
// Filter predicate helpers
// ---------------------------------------------------------------------------

function passesFilter(
  planet: Planet,
  filter: FilterId,
  colonyPlanetIds: Set<string>,
): boolean {
  switch (filter) {
    case 'terraform':
      return isTerraformable(planet) && planet.terraformDifficulty > 0;

    case 'minerals':
      return (
        planet.type === 'rocky' ||
        planet.type === 'terrestrial' ||
        planet.type === 'dwarf'
      );

    case 'isotopes':
      return (
        planet.type === 'rocky' ||
        planet.type === 'terrestrial' ||
        planet.type === 'dwarf'
      );

    case 'water':
      return (
        (planet.hydrosphere?.waterCoverageFraction ?? 0) > 0 ||
        (planet.habitability.water ?? 0) > 0
      );

    case 'life':
      return planet.hasLife === true;

    case 'volatiles':
      return (planet.atmosphere?.surfacePressureAtm ?? 0) > 0;

    case 'population':
      return colonyPlanetIds.has(planet.id);
  }
}

// ---------------------------------------------------------------------------
// Get filter stat value string for a planet
// ---------------------------------------------------------------------------

function getFilterStatLabel(
  planet: Planet,
  filter: FilterId | null,
  tfState: PlanetTerraformState | undefined,
  t: (key: string) => string,
  planetResourceStocks?: Record<string, PlanetResourceStocks>,
  colonyPlanetIds?: Set<string>,
): string | null {
  if (!filter) return null;
  switch (filter) {
    case 'terraform': {
      // Cap: if difficulty > 0.85 (and planet is terraformable), it's impossible
      const isTooHard = isTerraformable(planet) && (planet.terraformDifficulty ?? 0) > 0.85;
      if (!isTerraformable(planet) || isTooHard) return null;
      if (!tfState) {
        // Show native difficulty if no active state
        const pct = Math.round((planet.terraformDifficulty ?? 0) * 100);
        return `${pct}%`;
      }
      const pct = Math.round(getOverallProgress(tfState));
      return `${pct}%`;
    }
    case 'minerals':
    case 'isotopes':
    case 'water':
    case 'volatiles': {
      const stocks = planetResourceStocks?.[planet.id]?.remaining
        ?? generatePlanetStocks(planet).initial;
      return formatK(Math.round(stocks[filter]), t('format.k'), t('format.kk'));
    }
    case 'life':
      return planet.hasLife ? t('archive.filter_life_yes') : t('archive.filter_life_no');
    case 'population': {
      if (!colonyPlanetIds?.has(planet.id)) return '\u2014';
      // Base colony population; detailed building-based calc not available here
      const BASE_POP = 5000;
      return formatK(BASE_POP, t('format.k'), t('format.kk'));
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Terraform param order (same as TerraformPanel)
// ---------------------------------------------------------------------------

const PARAM_ORDER: TerraformParamId[] = [
  'magneticField',
  'atmosphere',
  'ozone',
  'temperature',
  'pressure',
  'water',
];

function primaryResourceForParam(
  paramId: TerraformParamId,
): 'minerals' | 'volatiles' | 'isotopes' | 'water' {
  switch (paramId) {
    case 'magneticField': return 'isotopes';
    case 'atmosphere':    return 'volatiles';
    case 'ozone':         return 'volatiles';
    case 'temperature':   return 'minerals';
    case 'pressure':      return 'volatiles';
    case 'water':         return 'water';
  }
}

// ---------------------------------------------------------------------------
// Inject glow + pulse keyframe once
// ---------------------------------------------------------------------------

const GLOW_STYLE_ID = 'nebulife-catalog-glow-v2';
if (typeof document !== 'undefined' && !document.getElementById(GLOW_STYLE_ID)) {
  const s = document.createElement('style');
  s.id = GLOW_STYLE_ID;
  s.textContent = `
    @keyframes nebucatalog-glow {
      0%, 100% { box-shadow: 0 0 4px rgba(68,136,170,0.3); }
      50%       { box-shadow: 0 0 10px rgba(68,136,170,0.7); }
    }
    @keyframes nebucatalog-focus-pulse {
      0%, 100% { box-shadow: 0 0 16px 4px rgba(68,136,255,0.55); }
      50%       { box-shadow: 0 0 24px 8px rgba(68,136,255,0.75); }
    }
    @keyframes nebucatalog-panel-in {
      from { max-height: 0; opacity: 0; }
      to   { max-height: 2000px; opacity: 1; }
    }
  `;
  document.head.appendChild(s);
}

// ---------------------------------------------------------------------------
// Cargo-ship SVG icon (16×16)
// ---------------------------------------------------------------------------

function CargoShipIcon({ color = '#7bb8ff' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="8,2 14,12 2,12" />
      <line x1="5" y1="12" x2="5" y2="14" />
      <line x1="11" y1="12" x2="11" y2="14" />
      <line x1="8" y1="6" x2="8" y2="10" />
    </svg>
  );
}

// Resource icons are now provided by shared ResourceIcon component (../ResourceIcon)

// ---------------------------------------------------------------------------
// PlanetCard — single grid cell (frameless, circle only)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// EarthLikePlanetSVG — fixed ocean+continent look for all earth-like planets
// ---------------------------------------------------------------------------

function safeSvgId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function seededUnit(seed: number, salt: number): number {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function seededRange(seed: number, salt: number, min: number, max: number): number {
  return min + seededUnit(seed, salt) * (max - min);
}

function EarthLikePlanetSVG({ r, cx, cy, planet }: { r: number; cx: number; cy: number; planet: Planet }) {
  const seed = Math.abs(planet.seed ?? 0);
  const safeId = safeSvgId(planet.id);
  const clipId = `el-clip-${safeId}`;
  const gradId = `el-grad-${safeId}`;
  // Scale continent paths relative to r (designed at r=24)
  const s = r / 24;
  const tx = cx - 24 * s;
  const ty = cy - 24 * s;
  const landTilt = seededRange(seed, 1, -18, 18);
  const cloudTilt = seededRange(seed, 2, -12, 12);
  const iceOpacity = 0.22 + seededUnit(seed, 3) * 0.18;
  return (
    <g>
      <defs>
        <radialGradient id={gradId} cx="38%" cy="32%" r="62%">
          <stop offset="0%" stopColor="#3399cc" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#1a5f8a" stopOpacity="1" />
          <stop offset="100%" stopColor="#0d3355" stopOpacity="1" />
        </radialGradient>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      {/* Ocean base */}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${gradId})`} />
      {/* Continent shapes — simple fixed paths scaled */}
      <g clipPath={`url(#${clipId})`} transform={`translate(${tx},${ty}) scale(${s})`}>
        <g transform={`rotate(${landTilt} 24 24)`}>
          {/* Main continent */}
          <path d="M20 18 L28 14 L34 16 L36 22 L32 28 L26 30 L20 26 Z" fill="#4a7a44" fillOpacity="0.75" />
          {/* Second land mass */}
          <path d="M30 32 L36 30 L40 34 L38 40 L32 40 L28 36 Z" fill="#5a8a50" fillOpacity="0.7" />
          {/* Small islands */}
          <path d="M14 30 L18 28 L20 32 L16 34 Z" fill="#4a7a44" fillOpacity="0.65" />
          <path d={`M${10 + seededUnit(seed, 4) * 7} ${16 + seededUnit(seed, 5) * 9} l4 -2 l3 3 l-3 4 l-5 -1 Z`} fill="#5f8d55" fillOpacity="0.42" />
        </g>
        {/* North ice cap hint */}
        <path d="M18 8 L30 8 L32 12 L28 14 L20 14 L16 12 Z" fill="#cce8f0" fillOpacity={iceOpacity} />
        <g transform={`rotate(${cloudTilt} 24 24)`}>
          <path d="M7 21 C16 16 30 18 41 13" stroke="#d7f3ff" strokeWidth="1.6" strokeOpacity="0.2" fill="none" />
          <path d="M9 33 C19 29 30 35 42 30" stroke="#d7f3ff" strokeWidth="1.2" strokeOpacity="0.15" fill="none" />
        </g>
      </g>
      {/* Atmosphere glow */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#5599cc" strokeWidth="1" strokeOpacity="0.5" />
    </g>
  );
}

function getPlanetDiameter(planet: Planet): number {
  const radius = Math.max(0.12, planet.radiusEarth || 1);
  if (planet.type === 'gas-giant') {
    return Math.round(76 + Math.min(1, Math.log10(radius) / 1.1) * 18);
  }
  if (planet.type === 'ice-giant') {
    return Math.round(68 + Math.min(1, Math.log10(radius + 0.4) / 0.9) * 14);
  }
  if (planet.type === 'dwarf') {
    return Math.round(28 + Math.min(1, radius / 0.75) * 12);
  }
  return Math.round(40 + Math.min(1, radius / 1.8) * 22);
}

function getShadeColor(planet: Planet, base: string): string {
  if (planet.type === 'gas-giant') return planet.surfaceTempK > 1000 ? '#5a241a' : '#5f4a34';
  if (planet.type === 'ice-giant') return '#183a66';
  if (planet.type === 'dwarf') return '#55564d';
  if ((planet.surfaceTempK ?? 300) > 600) return '#3f241a';
  if (isEarthLike(planet)) return '#0b2e4c';
  return luminanceSafe(base);
}

function PlanetSurfaceSVG({
  planet,
  color,
  r,
  cx,
  cy,
}: {
  planet: Planet;
  color: string;
  r: number;
  cx: number;
  cy: number;
}) {
  const safeId = safeSvgId(planet.id);
  const gradId = `pg-${safeId}`;
  const clipId = `pc-${safeId}`;
  const shade = getShadeColor(planet, color);
  const seed = Math.abs(planet.seed ?? 0);
  const tempK = planet.surfaceTempK ?? 300;
  const water = planet.hydrosphere?.waterCoverageFraction ?? planet.habitability?.water ?? 0;
  const atmo = planet.atmosphere?.surfacePressureAtm ?? 0;
  const isGiant = planet.type === 'gas-giant' || planet.type === 'ice-giant';
  const isHot = tempK > 600;
  const hasClouds = atmo > 0.4 || water > 0.25;
  const surfaceTilt = seededRange(seed, 7, -16, 16);
  const bandSkew = seededRange(seed, 8, -0.16, 0.16);
  const spotY = seededRange(seed, 9, -0.28, 0.28);

  const bandColors = planet.type === 'gas-giant'
    ? tempK > 1000
      ? ['#ff9a55', '#9a3f27', '#d0703d', '#6f3026']
      : ['#d6b37a', '#8f724d', '#c69a62', '#6d5941']
    : ['#8cc7d9', '#416d9d', '#6ba7c4', '#254d80'];

  return (
    <g>
      <defs>
        <radialGradient id={gradId} cx="34%" cy="30%" r="76%">
          <stop offset="0%" stopColor="#d7ecff" stopOpacity={planet.type === 'ice-giant' ? 0.38 : 0.22} />
          <stop offset="28%" stopColor={color} stopOpacity="0.96" />
          <stop offset="74%" stopColor={shade} stopOpacity="0.98" />
          <stop offset="100%" stopColor="#06101d" stopOpacity="1" />
        </radialGradient>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>

      <circle cx={cx} cy={cy} r={r} fill={`url(#${gradId})`} />

      <g clipPath={`url(#${clipId})`}>
        {isGiant ? (
          <g transform={`rotate(${surfaceTilt} ${cx} ${cy})`}>
            {[-0.52, -0.31, -0.11, 0.1, 0.29, 0.48].map((offset, i) => (
              <path
                key={offset}
                d={`M${cx - r * 1.18} ${cy + r * offset} C ${cx - r * 0.45} ${cy + r * (offset - 0.09 + bandSkew)}, ${cx + r * 0.36} ${cy + r * (offset + 0.12 - bandSkew * 0.7)}, ${cx + r * 1.18} ${cy + r * (offset + 0.02 + bandSkew * 0.35)}`}
                stroke={bandColors[i % bandColors.length]}
                strokeWidth={Math.max(3, r * (0.11 + (i % 2) * 0.035))}
                strokeOpacity={(planet.type === 'ice-giant' ? 0.22 : 0.35) + seededUnit(seed, i + 20) * 0.16}
                fill="none"
              />
            ))}
            <path
              d={`M${cx - r * 1.05} ${cy + r * seededRange(seed, 30, -0.05, 0.22)} C ${cx - r * 0.2} ${cy + r * seededRange(seed, 31, -0.22, 0.26)}, ${cx + r * 0.18} ${cy + r * seededRange(seed, 32, -0.28, 0.18)}, ${cx + r * 1.05} ${cy + r * seededRange(seed, 33, -0.03, 0.25)}`}
              stroke="#f4e2bb"
              strokeWidth={Math.max(1.2, r * 0.035)}
              strokeOpacity={planet.type === 'gas-giant' ? 0.22 : 0.12}
              fill="none"
            />
            {planet.type === 'gas-giant' && (
              <ellipse
                cx={cx + r * seededRange(seed, 10, 0.18, 0.42)}
                cy={cy + r * spotY}
                rx={r * 0.24}
                ry={r * seededRange(seed, 11, 0.08, 0.14)}
                fill={tempK > 1000 ? '#ffb06a' : '#d9a05f'}
                opacity="0.24"
                transform={`rotate(${seededRange(seed, 12, -10, 10)} ${cx + r * 0.34} ${cy + r * spotY})`}
              />
            )}
          </g>
        ) : (
          <>
            {isHot && (
              <>
                <path d={`M${cx - r * seededRange(seed, 13, 0.62, 0.32)} ${cy - r * 0.15} L${cx - r * 0.12} ${cy + r * seededRange(seed, 14, -0.02, 0.18)} L${cx - r * 0.28} ${cy + r * 0.48}`} stroke="#ff8844" strokeWidth="1.1" strokeOpacity="0.42" />
                <path d={`M${cx + r * 0.08} ${cy - r * 0.55} L${cx + r * seededRange(seed, 15, 0.18, 0.38)} ${cy - r * 0.12} L${cx + r * 0.18} ${cy + r * seededRange(seed, 16, 0.2, 0.44)}`} stroke="#cc5522" strokeWidth="1" strokeOpacity="0.34" />
              </>
            )}
            {!isHot && !isEarthLike(planet) && (
              <>
                {[0, 1, 2].map((i) => (
                  <ellipse
                    key={i}
                    cx={cx + r * seededRange(seed, 40 + i, -0.48, 0.42)}
                    cy={cy + r * seededRange(seed, 50 + i, -0.42, 0.45)}
                    rx={r * seededRange(seed, 60 + i, 0.1, 0.32)}
                    ry={r * seededRange(seed, 70 + i, 0.06, 0.18)}
                    fill={i === 1 ? '#000000' : '#ffffff'}
                    opacity={i === 1 ? 0.1 : planet.type === 'dwarf' ? 0.09 : 0.06}
                    transform={`rotate(${seededRange(seed, 80 + i, -28, 28)} ${cx} ${cy})`}
                  />
                ))}
              </>
            )}
            {hasClouds && (
              <>
                <path
                  d={`M${cx - r * 0.78} ${cy - r * seededRange(seed, 90, 0.02, 0.2)} C ${cx - r * 0.3} ${cy - r * seededRange(seed, 91, 0.16, 0.34)}, ${cx + r * 0.08} ${cy + r * seededRange(seed, 92, -0.02, 0.13)}, ${cx + r * 0.76} ${cy - r * seededRange(seed, 93, 0.04, 0.2)}`}
                  stroke="#d7f3ff"
                  strokeWidth={Math.max(1, r * 0.055)}
                  strokeOpacity="0.24"
                  fill="none"
                />
                <path
                  d={`M${cx - r * 0.64} ${cy + r * seededRange(seed, 94, 0.12, 0.32)} C ${cx - r * 0.08} ${cy + r * seededRange(seed, 95, 0.03, 0.24)}, ${cx + r * 0.36} ${cy + r * seededRange(seed, 96, 0.2, 0.42)}, ${cx + r * 0.72} ${cy + r * seededRange(seed, 97, 0.04, 0.24)}`}
                  stroke="#d7f3ff"
                  strokeWidth={Math.max(0.8, r * 0.035)}
                  strokeOpacity="0.16"
                  fill="none"
                />
              </>
            )}
          </>
        )}
      </g>

      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#d5efff" strokeWidth="0.9" strokeOpacity={isGiant ? 0.26 : 0.18} />
      <ellipse cx={cx - r * 0.24} cy={cy - r * 0.3} rx={r * 0.32} ry={r * 0.2} fill="#ffffff" opacity="0.12" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// k/kk number formatting helper
// ---------------------------------------------------------------------------

function formatK(n: number, suffix_k: string, suffix_kk: string): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    const v = n / 1_000_000;
    return v < 10 ? `${v.toFixed(1)}${suffix_kk}` : `${Math.floor(v)}${suffix_kk}`;
  }
  if (abs >= 1_000) {
    return `${Math.floor(n / 1_000)}${suffix_k}`;
  }
  return String(Math.round(n));
}

// ---------------------------------------------------------------------------
// PlanetCard — single grid cell (frameless, circle only)
// ---------------------------------------------------------------------------

function PlanetCard({
  planet,
  filterStat,
  activeFilter,
  isSelected,
  isFavorite,
  onClick,
}: {
  planet: Planet;
  filterStat: string | null;
  activeFilter: FilterId | null;
  isSelected: boolean;
  isFavorite: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const [hover, setHover] = useState(false);

  const color = getPlanetBodyColor(planet);
  const earthLike = isEarthLike(planet);

  // Visual scale keeps Earth-sized worlds readable while letting giants feel massive.
  const diameter = getPlanetDiameter(planet);
  const canvas = 96;
  const cx = canvas / 2;
  const cy = canvas / 2;
  const r = diameter / 2;
  const safePlanetId = safeSvgId(planet.id);
  const seed = Math.abs(planet.seed ?? 0);
  const ringTilt = seededRange(seed, 120, -24, 18);

  const hasRings =
    planet.type === 'gas-giant' ||
    planet.type === 'ice-giant' ||
    (planet.moons && planet.moons.length >= 3);

  // Sub-label: for terraform filter show difficulty or "impossible";
  // for other active filters show filter stat value; otherwise nothing.
  const isTooHardToTerraform = isTerraformable(planet) && (planet.terraformDifficulty ?? 0) > 0.85;
  const terraformNotPossible = !isTerraformable(planet) || isTooHardToTerraform;
  const isTerraformFilter = activeFilter === 'terraform';

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={planet.name}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        padding: '4px 2px 6px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'monospace',
      }}
    >
      {/* Circle wrapper — glow goes here */}
      <div
        style={{
          borderRadius: '50%',
          width: canvas,
          height: canvas,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: hover || isSelected ? 'saturate(1.12)' : 'saturate(0.98)',
          animation: isSelected
            ? 'nebucatalog-focus-pulse 1.8s ease-in-out infinite'
            : hover
            ? 'nebucatalog-glow 1.2s ease-in-out infinite'
            : 'none',
          transition: 'box-shadow 0.2s',
        }}
      >
        {/* SVG planet representation */}
        <svg width={canvas} height={canvas} viewBox={`0 0 ${canvas} ${canvas}`} style={{ overflow: 'visible' }}>
          <defs>
            <filter id={`planet-shadow-${safePlanetId}`} x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="0" stdDeviation={planet.type === 'gas-giant' ? '2.2' : '1.5'} floodColor={color} floodOpacity="0.28" />
            </filter>
          </defs>
          {/* Ring (behind planet) */}
          {hasRings && (
            <g transform={`rotate(${ringTilt} ${cx} ${cy})`} opacity={planet.type === 'gas-giant' ? 0.44 : 0.28}>
              <ellipse
                cx={cx}
                cy={cy}
                rx={r * seededRange(seed, 121, 1.34, 1.58)}
                ry={r * seededRange(seed, 122, 0.25, 0.36)}
                fill="none"
                stroke={`${color}aa`}
                strokeWidth="1.25"
              />
              <ellipse
                cx={cx}
                cy={cy}
                rx={r * seededRange(seed, 123, 1.54, 1.78)}
                ry={r * seededRange(seed, 124, 0.34, 0.43)}
                fill="none"
                stroke="#c9d6e6"
                strokeOpacity="0.22"
                strokeWidth="0.8"
              />
            </g>
          )}
          <g filter={`url(#planet-shadow-${safePlanetId})`}>
            {/* Planet body */}
            {earthLike ? (
              <EarthLikePlanetSVG r={r} cx={cx} cy={cy} planet={planet} />
            ) : (
              <PlanetSurfaceSVG planet={planet} color={color} r={r} cx={cx} cy={cy} />
            )}
          </g>
          {/* Home planet indicator */}
          {planet.isHomePlanet && (
            <circle
              cx={cx}
              cy={cy}
              r={r + 4}
              fill="none"
              stroke="#44ff88"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
          )}
        </svg>
      </div>

      {/* Sub-label: only shown when terraform filter active or non-null filterStat */}
      {isTerraformFilter ? (
        <div style={{
          fontSize: 9,
          color: terraformNotPossible ? '#556677' : '#7bb8ff',
          textAlign: 'center',
          fontFamily: 'monospace',
          letterSpacing: 0.3,
          maxWidth: 88,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {terraformNotPossible ? t('archive.terraform_impossible') : (filterStat ?? '')}
        </div>
      ) : filterStat !== null ? (
        <div style={{
          fontSize: 9,
          color: '#7bb8ff',
          textAlign: 'center',
          fontFamily: 'monospace',
          letterSpacing: 0.3,
        }}>
          {filterStat}
        </div>
      ) : null}
      {/* Planet name — only for pinned/favorite planets */}
      {isFavorite && (
        <div style={{
          fontSize: 8,
          color: '#7bb8ff',
          textAlign: 'center',
          fontFamily: 'monospace',
          maxWidth: 88,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          letterSpacing: 0.2,
          marginTop: 1,
        }}>
          {planet.name}
        </div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Filter chip bar
// ---------------------------------------------------------------------------

const FILTERS: FilterId[] = [
  'terraform',
  'minerals',
  'isotopes',
  'water',
  'life',
  'volatiles',
  'population',
];

const FILTER_ICONS: Record<FilterId, React.ReactNode> = {
  terraform: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="5.8" />
      <path d="M4.7 10.8 C6.6 7.9 9.4 7.1 13.2 8.1" opacity="0.75" />
      <path d="M8.8 12.1 C10.1 10.7 11.1 10.1 12.9 9.8" opacity="0.55" />
      <path d="M9 2.2 V4.2 M15.8 9 H13.8" opacity="0.55" />
    </svg>
  ),
  minerals: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2.5 L14 8.2 L11.8 15 H6.2 L4 8.2 Z" />
      <path d="M9 2.5 L9 15 M4 8.2 H14 M6.2 15 L9 8.2 L11.8 15" opacity="0.55" />
    </svg>
  ),
  isotopes: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="1.7" fill="currentColor" stroke="none" opacity="0.6" />
      <ellipse cx="9" cy="9" rx="7" ry="2.8" />
      <ellipse cx="9" cy="9" rx="7" ry="2.8" transform="rotate(60 9 9)" />
      <ellipse cx="9" cy="9" rx="7" ry="2.8" transform="rotate(-60 9 9)" />
    </svg>
  ),
  water: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2.5 C9 2.5 4.3 8.1 4.3 11.4 A4.7 4.7 0 0 0 13.7 11.4 C13.7 8.1 9 2.5 9 2.5 Z" />
      <path d="M6.4 12.3 C7.7 13.3 10.3 13.3 11.6 12.3" opacity="0.55" />
    </svg>
  ),
  life: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 15 V9" />
      <path d="M9 9 C6.2 8.8 4.6 7.3 4.1 4.7 C6.8 4.7 8.4 6.1 9 9 Z" />
      <path d="M9 10 C11.9 9.7 13.7 8 14 5.2 C11.1 5.3 9.6 7 9 10 Z" />
      <path d="M6.5 13.8 H11.5" opacity="0.55" />
    </svg>
  ),
  volatiles: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="4.2" />
      <path d="M3 8.2 C5.5 5.3 12.5 5.3 15 8.2" opacity="0.6" />
      <path d="M3 11 C5.8 13.5 12.2 13.5 15 11" opacity="0.45" />
      <path d="M5.4 5.2 C6.9 3.8 11.1 3.8 12.6 5.2" opacity="0.35" />
    </svg>
  ),
  population: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 13.5 H14.5" />
      <path d="M4.5 13.5 V10.2 C4.5 7.7 6.5 5.7 9 5.7 C11.5 5.7 13.5 7.7 13.5 10.2 V13.5" />
      <path d="M7 13.5 V10.6 H11 V13.5" />
      <path d="M6.2 6.2 L9 3.8 L11.8 6.2" opacity="0.55" />
    </svg>
  ),
};

const FILTER_ACCENTS: Record<FilterId, string> = {
  terraform: '#7bb8ff',
  minerals: '#aa8855',
  isotopes: '#88aa44',
  water: '#3b82f6',
  life: '#44ff88',
  volatiles: '#55aaaa',
  population: '#aaccff',
};

function FilterChip({
  filterId,
  active,
  onToggle,
}: {
  filterId: FilterId;
  active: boolean;
  onToggle: (id: FilterId) => void;
}) {
  const { t } = useTranslation();
  const [hover, setHover] = useState(false);
  const [showLabel, setShowLabel] = useState(false);

  const labelKey: Record<FilterId, string> = {
    terraform: 'archive.filter_terraform',
    minerals: 'archive.filter_minerals',
    isotopes: 'archive.filter_isotopes',
    water: 'archive.filter_water',
    life: 'archive.filter_life',
    volatiles: 'archive.filter_volatiles',
    population: 'archive.filter_population',
  };
  const accent = FILTER_ACCENTS[filterId];
  const label = t(labelKey[filterId]);
  const expanded = active || showLabel;

  return (
    <button
      onClick={() => onToggle(filterId)}
      onMouseEnter={() => { setHover(true); setShowLabel(true); }}
      onMouseLeave={() => { setHover(false); setShowLabel(false); }}
      onTouchStart={() => setShowLabel(true)}
      onTouchEnd={() => setTimeout(() => setShowLabel(false), 1200)}
      title={label}
      aria-label={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: expanded ? 6 : 0,
        minWidth: expanded ? 0 : 44,
        height: 44,
        padding: expanded ? '0 12px' : 0,
        background: active
          ? `linear-gradient(180deg, ${accent}24, rgba(10, 18, 32, 0.56))`
          : hover
            ? 'rgba(20, 38, 58, 0.42)'
            : 'rgba(5, 10, 20, 0.2)',
        border: active
          ? `1px solid ${accent}aa`
          : '1px solid rgba(68, 102, 136, 0.36)',
        borderRadius: 22,
        color: active ? accent : hover ? '#aabbcc' : '#667788',
        fontFamily: 'monospace',
        fontSize: 10,
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s, color 0.15s, min-width 0.15s, padding 0.15s',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        boxShadow: active ? `0 0 14px ${accent}1f` : 'none',
      }}
    >
      {FILTER_ICONS[filterId]}
      {expanded && (
        <span style={{ letterSpacing: 0.4, color: active ? '#ccddee' : '#8899aa' }}>{label}</span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Terraform param row (progress bar + dispatch button) inside detail panel
// ---------------------------------------------------------------------------

function TerraformParamDetailRow({
  paramId,
  planet,
  terraformState,
  donorPlanets,
  techTreeState,
  shipTier,
  getPlanetResources,
  onSendTerraformDelivery,
}: {
  paramId: TerraformParamId;
  planet: Planet;
  terraformState: PlanetTerraformState;
  donorPlanets: Planet[];
  techTreeState: TechTreeState | undefined;
  shipTier: number;
  getPlanetResources?: (planetId: string) => ColonyResources;
  onSendTerraformDelivery?: (targetPlanet: Planet, paramId: TerraformParamId) => void;
}) {
  const { t } = useTranslation();

  const paramState = terraformState.params[paramId];
  const progress = paramState?.progress ?? 0;
  const pct = Math.round(progress);
  const resource = primaryResourceForParam(paramId);

  // Compute requirement & delivered amounts
  const requirement = useMemo(() => {
    try {
      const cost = computeParamRequirement(planet, paramId, progress);
      return (cost as Record<string, number | undefined>)[resource] ?? 0;
    } catch {
      return 0;
    }
  }, [planet, paramId, progress, resource]);

  const delivered = requirement > 0
    ? Math.round((progress / 100) * requirement)
    : 0;

  // Gate check
  const hasGenesisVault = false; // catalog doesn't have genesis vault context — safe default
  const gate = useMemo(() => {
    if (!techTreeState) return { allowed: true, reason: null };
    try {
      return canStartParam(terraformState, paramId, hasGenesisVault, planet, techTreeState);
    } catch {
      return { allowed: true, reason: null };
    }
  }, [terraformState, paramId, planet, techTreeState]);

  const hasDonors = donorPlanets.length > 0;
  const hasShip = shipTier >= 1;

  // Check resource availability on any donor
  const hasEnoughResource = useMemo(() => {
    if (!getPlanetResources || donorPlanets.length === 0) return false;
    return donorPlanets.some((d) => {
      const res = getPlanetResources(d.id);
      return res[resource] > 0;
    });
  }, [donorPlanets, getPlanetResources, resource]);

  // Derive disabled tooltip
  let disabledReason = '';
  let canDispatch = false;

  if (!hasShip) {
    disabledReason = t('planets_catalog.disabled_no_ship');
  } else if (!hasDonors) {
    disabledReason = t('planets_catalog.disabled_no_ship');
  } else if (!gate.allowed) {
    const reason = gate.reason ?? '';
    if (reason.startsWith('tech_required:')) {
      disabledReason = t('planets_catalog.disabled_need_tech', { tech: reason.slice('tech_required:'.length) });
    } else if (reason.startsWith('level_required:')) {
      disabledReason = t('planets_catalog.disabled_need_level', { level: reason.slice('level_required:'.length) });
    } else if (reason === 'need_building') {
      disabledReason = t('planets_catalog.disabled_need_building');
    } else {
      disabledReason = reason;
    }
  } else if (!hasEnoughResource) {
    disabledReason = t('planets_catalog.disabled_no_resources');
  } else {
    canDispatch = true;
  }

  // Bar color
  const barColor = pct >= 95 ? '#44ff88' : pct >= 50 ? '#7bb8ff' : '#446688';

  const paramLabelKey = `terraform.param_full.${paramId}`;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      padding: '6px 0',
      borderBottom: '1px solid rgba(50,65,85,0.3)',
    }}>
      {/* Param name + button row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{
          fontSize: 10,
          color: '#8899aa',
          flex: 1,
          minWidth: 0,
          fontFamily: 'monospace',
        }}>
          {t(paramLabelKey, { defaultValue: t(`terraform.param.${paramId}`, { defaultValue: paramId }) })}
        </span>

        {/* Dispatch button */}
        <button
          disabled={!canDispatch}
          title={disabledReason || undefined}
          onClick={() => {
            if (canDispatch && onSendTerraformDelivery) {
              onSendTerraformDelivery(planet, paramId);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            minHeight: 28,
            minWidth: 44,
            background: canDispatch ? 'rgba(40,70,100,0.7)' : 'rgba(20,30,45,0.4)',
            border: `1px solid ${canDispatch ? '#446688' : '#223344'}`,
            borderRadius: 3,
            color: canDispatch ? '#7bb8ff' : '#334455',
            fontFamily: 'monospace',
            fontSize: 9,
            cursor: canDispatch ? 'pointer' : 'not-allowed',
            flexShrink: 0,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            transition: 'all 0.15s',
          }}
        >
          <CargoShipIcon color={canDispatch ? '#7bb8ff' : '#334455'} />
          {t('planets_catalog.btn_send')}
        </button>
      </div>

      {/* Progress bar with overlay text */}
      <div style={{
        position: 'relative',
        height: 18,
        background: 'rgba(5,10,20,0.8)',
        border: '1px solid rgba(51,68,85,0.4)',
        borderRadius: 3,
        overflow: 'hidden',
      }}>
        {/* Fill */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: `${pct}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${barColor}44, ${barColor}88)`,
          transition: 'width 0.4s ease',
        }} />
        {/* Overlay text: delivered / required resource */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 6px',
          fontSize: 9,
          fontFamily: 'monospace',
          color: '#aabbcc',
          pointerEvents: 'none',
        }}>
          <span style={{ color: '#8899aa' }}>
            {requirement > 0
              ? `${delivered.toLocaleString()} / ${Math.ceil(requirement).toLocaleString()} ${resource}`
              : `${pct}%`}
          </span>
          <span style={{ color: pct >= 95 ? '#44ff88' : pct >= 50 ? '#7bb8ff' : '#8899aa' }}>
            {pct}%
          </span>
        </div>
      </div>

      {/* Disabled reason hint */}
      {!canDispatch && disabledReason && (
        <div style={{ fontSize: 8, color: '#cc8844', letterSpacing: 0.3, paddingLeft: 2 }}>
          {disabledReason}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// InlinePlanetMenu — small popup anchored below a card (kept for compat)
// ---------------------------------------------------------------------------

function InlinePlanetMenu({
  planet,
  system,
  isFavorite,
  canGoToSurface,
  onViewDetail,
  onToggleFavorite,
  onOpenSurface,
  onClose,
}: {
  planet: Planet;
  system: StarSystem;
  isFavorite: boolean;
  canGoToSurface: boolean;
  onViewDetail: () => void;
  onToggleFavorite: () => void;
  onOpenSurface: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginTop: 4,
        zIndex: 40,
        background: 'rgba(10,15,25,0.97)',
        border: '1px solid #334455',
        borderRadius: 4,
        minWidth: 140,
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => { onViewDetail(); onClose(); }}
        style={{
          display: 'block', width: '100%',
          padding: '8px 12px', background: 'none', border: 'none',
          color: '#aabbcc', fontFamily: 'monospace', fontSize: 11,
          textAlign: 'left', cursor: 'pointer',
          transition: 'background 0.1s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(68,102,136,0.2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
      >
        {t('archive.planet_menu_view')}
      </button>
      <button
        onClick={() => { onToggleFavorite(); onClose(); }}
        style={{
          display: 'block', width: '100%',
          padding: '8px 12px', background: 'none', border: 'none',
          color: isFavorite ? '#7bb8ff' : '#8899aa', fontFamily: 'monospace', fontSize: 11,
          textAlign: 'left', cursor: 'pointer',
          transition: 'background 0.1s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(68,102,136,0.2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
      >
        {isFavorite ? t('archive.planet_menu_unfavorite') : t('archive.planet_menu_favorite')}
      </button>
      <button
        onClick={() => { if (canGoToSurface) { onOpenSurface(); onClose(); } }}
        disabled={!canGoToSurface}
        style={{
          display: 'block', width: '100%',
          padding: '8px 12px', background: 'none', border: 'none',
          color: canGoToSurface ? '#8899aa' : '#445566',
          fontFamily: 'monospace', fontSize: 11,
          textAlign: 'left',
          cursor: canGoToSurface ? 'pointer' : 'not-allowed',
          transition: 'background 0.1s',
          opacity: canGoToSurface ? 1 : 0.5,
        }}
        onMouseEnter={(e) => { if (canGoToSurface) e.currentTarget.style.background = 'rgba(68,102,136,0.2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
      >
        {t('nav.surface_btn')}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ExpandedDetailPanel — full-width inline panel that slides down below a row
// ---------------------------------------------------------------------------

interface ExpandedDetailPanelProps {
  planet: Planet;
  system: StarSystem;
  distanceLY: number | null;
  tfState: PlanetTerraformState | undefined;
  colonyPlanetIds: Set<string>;
  donorPlanets: Planet[];
  techTreeState: TechTreeState | undefined;
  shipTier: number;
  getPlanetResources?: (planetId: string) => ColonyResources;
  onSendTerraformDelivery?: (targetPlanet: Planet, paramId: TerraformParamId) => void;
  onCompleteTerraform?: (planet: Planet) => void;
  /** Callback when user saves a custom name for the planet */
  onRenamePlanet?: (planetId: string, newName: string) => void;
  /** Callback to toggle pin/favorite for a planet */
  onToggleFavorite?: (planetId: string) => void;
  /** Whether this planet is currently pinned/favorited */
  isFavorite?: boolean;
  /** Callback to open the planet detail view */
  onViewPlanet?: (system: StarSystem, planetId: string) => void;
  onClose: () => void;
  /** Finite planet resource stocks for displaying remaining deposit units (v168). */
  planetResourceStocks?: Record<string, PlanetResourceStocks>;
}

function ExpandedDetailPanel({
  planet,
  system,
  distanceLY,
  tfState,
  colonyPlanetIds,
  donorPlanets,
  techTreeState,
  shipTier,
  getPlanetResources,
  onSendTerraformDelivery,
  onCompleteTerraform,
  onRenamePlanet,
  onToggleFavorite,
  isFavorite = false,
  onViewPlanet,
  onClose,
  planetResourceStocks,
}: ExpandedDetailPanelProps) {
  const { t } = useTranslation();

  // Inline rename state
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(planet.name);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renaming]);

  const commitRename = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== planet.name) {
      onRenamePlanet?.(planet.id, trimmed);
    }
    setRenaming(false);
  }, [renameValue, planet.id, planet.name, onRenamePlanet]);

  const overallPct = tfState ? Math.round(getOverallProgress(tfState)) : 0;
  const showTerraformSection = isTerraformable(planet) && !!tfState;
  const showCompleteButton = showTerraformSection && overallPct >= 95;

  // Resource stocks — prefer finite planet stocks (v168); fall back to colony inventory
  const stocksForDisplay: { minerals: number; volatiles: number; isotopes: number; water: number } | null = useMemo(() => {
    if (planetResourceStocks) {
      const s = planetResourceStocks[planet.id];
      if (s) return s.remaining;
      // No tracked stocks yet — generate initial values deterministically
      return generatePlanetStocks(planet).initial;
    }
    // Fallback: use colony inventory (legacy path)
    if (getPlanetResources) return getPlanetResources(planet.id);
    return null;
  }, [planet, planetResourceStocks, getPlanetResources]);
  const planetStocks = stocksForDisplay;

  const typeKey: Record<string, string> = {
    rocky: 'planet.rocky',
    terrestrial: 'planet.terrestrial',
    'gas-giant': 'planet.gas_giant',
    'ice-giant': 'planet.ice_giant',
    dwarf: 'planet.dwarf',
  };
  const typeLabel = t(typeKey[planet.type] ?? planet.type);

  const lyNum = distanceLY ?? 0;
  const pcNum = lyNum * 0.30660;

  // Small planet circle color for the header
  const planetColor = getPlanetBodyColor(planet);

  // Info grid: left column = gravity, moons; right column = other params (no Colony field)
  const leftFields: Array<{ label: string; value: string }> = [
    { label: t('planets_catalog.field_gravity'), value: `${planet.surfaceGravityG.toFixed(2)} g` },
    { label: t('planets_catalog.field_moons'), value: String(planet.moons.length) },
  ];
  const rightFields: Array<{ label: string; value: string }> = [
    { label: t('planets_catalog.field_size'), value: `${planet.radiusEarth.toFixed(2)} R\u2295` },
    {
      label: t('planets_catalog.field_hydro'),
      value: planet.hydrosphere
        ? `${Math.round(Math.min(0.95, planet.hydrosphere.waterCoverageFraction) * 100)}%`
        : '\u2014',
    },
    {
      label: t('planets_catalog.field_distance_short'),
      value: distanceLY !== null
        ? `${lyNum.toFixed(1)} LY / ${pcNum.toFixed(2)} pc`
        : '\u2014',
    },
  ];

  return (
    <div style={{
      gridColumn: '1 / -1',
      background: 'rgba(8,14,26,0.97)',
      border: '1px solid #334455',
      borderRadius: 4,
      fontFamily: 'monospace',
      overflow: 'hidden',
      animation: 'nebucatalog-panel-in 0.25s ease-out both',
      // Fits screen width
      maxWidth: 'calc(100vw - 32px)',
      boxSizing: 'border-box',
    }}>
      {/* 1. Header: [planet 48px] | [name + type] | [pencil] [pin] [eye] | [X close] */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        borderBottom: '1px solid rgba(51,68,85,0.4)',
      }}>
        {/* Mini planet circle */}
        <svg width="48" height="48" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
          {isEarthLike(planet) ? (
            <EarthLikePlanetSVG r={20} cx={24} cy={24} planet={planet} />
          ) : (
            <PlanetSurfaceSVG planet={planet} color={planetColor} r={20} cx={24} cy={24} />
          )}
          {planet.isHomePlanet && (
            <circle cx="24" cy="24" r="23" fill="none" stroke="#44ff88" strokeWidth="1.2" strokeDasharray="3 3" />
          )}
        </svg>

        {/* Name + type (second line) */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {renaming ? (
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') { setRenaming(false); setRenameValue(planet.name); }
              }}
              style={{
                fontFamily: 'monospace',
                fontSize: 13,
                color: '#ccddee',
                background: 'rgba(10,20,35,0.9)',
                border: '1px solid #446688',
                borderRadius: 3,
                padding: '2px 6px',
                outline: 'none',
                width: '100%',
                maxWidth: 200,
              }}
            />
          ) : (
            <div style={{ fontSize: 13, color: '#ccddee', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {planet.name}
            </div>
          )}
          <div style={{ fontSize: 9, color: '#667788', marginTop: 2, letterSpacing: '0.05em' }}>
            {typeLabel}
          </div>
        </div>

        {/* Action buttons: pencil / pin / eye */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {onRenamePlanet && !renaming && (
            <button
              onClick={() => { setRenameValue(planet.name); setRenaming(true); }}
              title={t('planets_catalog.rename_title')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 2, opacity: 0.45, transition: 'opacity 0.15s',
                lineHeight: 0, flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.45'; }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#aabbcc" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 2 L14 5 L5 14 L2 14 L2 11 Z" />
                <line x1="9" y1="4" x2="12" y2="7" />
              </svg>
            </button>
          )}
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(planet.id)}
              title={isFavorite ? t('archive.unpin') : t('archive.pin')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 2, opacity: isFavorite ? 1 : 0.4,
                transition: 'opacity 0.15s', lineHeight: 0, flexShrink: 0,
                color: isFavorite ? '#7bb8ff' : '#aabbcc',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = isFavorite ? '1' : '0.4'; }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill={isFavorite ? '#7bb8ff' : 'none'}
                stroke={isFavorite ? '#7bb8ff' : '#aabbcc'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2 L10 6 L14 6.5 L11 9.5 L11.8 14 L8 12 L4.2 14 L5 9.5 L2 6.5 L6 6 Z" />
              </svg>
            </button>
          )}
          {onViewPlanet && (
            <button
              onClick={() => { onViewPlanet(system, planet.id); onClose(); }}
              title={t('archive.planet_menu_view')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 2, opacity: 0.45, transition: 'opacity 0.15s',
                lineHeight: 0, flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.45'; }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#aabbcc" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 8 C3 4 13 4 15 8 C13 12 3 12 1 8 Z" />
                <circle cx="8" cy="8" r="2.5" />
              </svg>
            </button>
          )}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#556677',
            fontFamily: 'monospace',
            fontSize: 13,
            cursor: 'pointer',
            padding: '0 4px',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="4" y1="4" x2="12" y2="12" />
            <line x1="12" y1="4" x2="4" y2="12" />
          </svg>
        </button>
      </div>

      <div style={{ padding: '10px 12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* 2. Terraform param list */}
        {showTerraformSection && tfState && (
          <div>
            <div style={{
              fontSize: 8,
              color: '#445566',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}>
              {t('planets_catalog.tf_section_title')}
            </div>
            {PARAM_ORDER.map((paramId) => (
              <TerraformParamDetailRow
                key={paramId}
                paramId={paramId}
                planet={planet}
                terraformState={tfState}
                donorPlanets={donorPlanets}
                techTreeState={techTreeState}
                shipTier={shipTier}
                getPlanetResources={getPlanetResources}
                onSendTerraformDelivery={onSendTerraformDelivery}
              />
            ))}
          </div>
        )}

        {/* 3. Resource stocks — icon + value only, no title/header */}
        {planetStocks && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#8899aa' }}>
              <ResourceIcon type="minerals" size={12} />
              <span style={{ color: RESOURCE_COLORS.minerals }}>{formatK(Math.round(planetStocks.minerals), t('format.k'), t('format.kk'))}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#8899aa' }}>
              <ResourceIcon type="volatiles" size={12} />
              <span style={{ color: RESOURCE_COLORS.volatiles }}>{formatK(Math.round(planetStocks.volatiles), t('format.k'), t('format.kk'))}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#8899aa' }}>
              <ResourceIcon type="isotopes" size={12} />
              <span style={{ color: RESOURCE_COLORS.isotopes }}>{formatK(Math.round(planetStocks.isotopes), t('format.k'), t('format.kk'))}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#8899aa' }}>
              <ResourceIcon type="water" size={12} />
              <span style={{ color: RESOURCE_COLORS.water }}>{formatK(Math.round(planetStocks.water), t('format.k'), t('format.kk'))}</span>
            </div>
          </div>
        )}

        {/* 4b. Info grid — 2 columns: left = gravity+moons; right = size+hydro+distance */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2px 12px',
        }}>
          {/* Left column */}
          <div>
            {leftFields.map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid rgba(40,55,75,0.25)', padding: '3px 0' }}>
                <span style={{ fontSize: 9, color: '#445566' }}>{label}</span>
                <span style={{ fontSize: 9, color: '#8899aa' }}>{value}</span>
              </div>
            ))}
          </div>
          {/* Right column */}
          <div>
            {rightFields.map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid rgba(40,55,75,0.25)', padding: '3px 0' }}>
                <span style={{ fontSize: 9, color: '#445566' }}>{label}</span>
                <span style={{ fontSize: 9, color: '#8899aa', textAlign: 'right', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Final terraform button — only if >=95% */}
        {showCompleteButton && (
          <button
            onClick={() => onCompleteTerraform?.(planet)}
            style={{
              padding: '10px 20px',
              background: 'rgba(30,80,50,0.8)',
              border: '1px solid #44ff88',
              borderRadius: 4,
              color: '#44ff88',
              fontFamily: 'monospace',
              fontSize: 12,
              cursor: 'pointer',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              textAlign: 'center',
              minHeight: 44,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(30,100,60,0.9)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(30,80,50,0.8)'; }}
          >
            {t('planets_catalog.btn_terraform_complete')}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlanetsCatalogV2
// ---------------------------------------------------------------------------

const PAGE_SIZE = 24;

export function PlanetsCatalogV2({
  allSystems,
  aliases,
  onViewPlanet,
  colonyPlanetIds,
  colonySystemIds,
  terraformStates,
  onOpenSurface,
  onToggleFavorite,
  favoritePlanetIds,
  getPlanetResources,
  onSendTerraformDelivery,
  onCompleteTerraform,
  donorPlanets = [],
  techTreeState,
  colonyBuildings = [],
  onRenamePlanet,
  planetResourceStocks,
}: PlanetsCatalogV2Props) {
  // Single-select filter: null = no filter active
  const [selectedFilter, setSelectedFilter] = useState<FilterId | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Focused planet — drives inline expanded detail panel
  const [focusedPlanetId, setFocusedPlanetId] = useState<string | null>(null);
  const [menuOpenForId, setMenuOpenForId] = useState<string | null>(null);

  // Build flat list of { system, planet } pairs, sorted by distance from
  // nearest colony. Distance is computed once per system via useMemo.

  const systemDistances = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>();
    for (const sys of allSystems) {
      const result = nearestColonyDistance(sys.id, allSystems, colonySystemIds);
      map.set(sys.id, result ? result.ly : Infinity);
    }
    return map;
  }, [allSystems, colonySystemIds]);

  const sortedPairs = useMemo(() => {
    const pairs: { system: StarSystem; planet: Planet }[] = [];
    for (const sys of allSystems) {
      for (const p of sys.planets) {
        pairs.push({ system: sys, planet: p });
      }
    }
    pairs.sort((a, b) => {
      // Pinned/favorite planets always first
      const aPin = favoritePlanetIds?.has(a.planet.id) ? 0 : 1;
      const bPin = favoritePlanetIds?.has(b.planet.id) ? 0 : 1;
      if (aPin !== bPin) return aPin - bPin;

      // Terraform filter: sort by terraformDifficulty ascending, impossible last
      if (selectedFilter === 'terraform') {
        const isTerraformImpossible = (p: Planet): boolean =>
          !isTerraformable(p) || (p.terraformDifficulty ?? 0) > 0.85;
        const aImp = isTerraformImpossible(a.planet) ? 1 : 0;
        const bImp = isTerraformImpossible(b.planet) ? 1 : 0;
        if (aImp !== bImp) return aImp - bImp;
        // Both terraformable or both impossible — sort by difficulty ascending
        const aDiff = a.planet.terraformDifficulty ?? 1;
        const bDiff = b.planet.terraformDifficulty ?? 1;
        if (aDiff !== bDiff) return aDiff - bDiff;
      }

      // When minerals filter is active (or no filter), sort by minerals descending.
      // Priority: v168 stock units (remaining) > generated initial stock > colony inventory > raw resource value.
      if (selectedFilter === 'minerals' || selectedFilter === null) {
        const getMinerals = (planet: Planet): number => {
          if (planetResourceStocks) {
            const s = planetResourceStocks[planet.id];
            if (s) return s.remaining.minerals;
            return generatePlanetStocks(planet).initial.minerals;
          }
          if (getPlanetResources) return getPlanetResources(planet.id)?.minerals ?? 0;
          return planet.resources?.totalResources?.minerals ?? 0;
        };
        const aMin = getMinerals(a.planet);
        const bMin = getMinerals(b.planet);
        if (bMin !== aMin) return bMin - aMin;
      }

      const dA = systemDistances.get(a.system.id) ?? Infinity;
      const dB = systemDistances.get(b.system.id) ?? Infinity;
      return dA - dB;
    });
    return pairs;
  }, [allSystems, systemDistances, favoritePlanetIds, selectedFilter, getPlanetResources, planetResourceStocks]);

  // Apply single filter
  const filteredPairs = useMemo(() => {
    if (selectedFilter === null) return sortedPairs;
    return sortedPairs.filter(({ planet }) =>
      passesFilter(planet, selectedFilter, colonyPlanetIds),
    );
  }, [sortedPairs, selectedFilter, colonyPlanetIds]);

  // Reset visible count when filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedFilter]);

  const visiblePairs = filteredPairs.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPairs.length;

  // IntersectionObserver lazy load
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + PAGE_SIZE);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore]);

  // Single-select toggle: click active → deselect; click other → switch
  const toggleFilter = useCallback((id: FilterId) => {
    setSelectedFilter((prev) => (prev === id ? null : id));
  }, []);

  const { t } = useTranslation();

  // Close mini-menu when clicking outside any card
  const handleGridClick = useCallback(() => {
    setMenuOpenForId(null);
  }, []);

  // Find focused pair for the detail panel
  const focusedPair = useMemo(() => {
    if (!focusedPlanetId) return null;
    return sortedPairs.find((p) => p.planet.id === focusedPlanetId) ?? null;
  }, [focusedPlanetId, sortedPairs]);

  // Ship tier from buildings (for dispatch gate)
  const shipTier = useMemo(
    () => tierForBuildings(colonyBuildings, techTreeState?.researched),
    [colonyBuildings, techTreeState],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filter chip bar — single-select */}
      <div
        style={{
          display: 'flex',
          gap: 7,
          flexWrap: 'nowrap',
          overflowX: 'auto',
          padding: '2px 2px 12px',
          borderBottom: '1px solid rgba(51, 68, 85, 0.24)',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
        data-swipe-tabs=""
      >
        {FILTERS.map((f) => (
          <FilterChip
            key={f}
            filterId={f}
            active={selectedFilter === f}
            onToggle={toggleFilter}
          />
        ))}
      </div>

      {/* Count label */}
      <div style={{ fontSize: 10, color: '#445566', letterSpacing: 0.5 }}>
        {filteredPairs.length} / {sortedPairs.length}
      </div>

      {/* Planet grid + inline panels — auto-fill sieve layout */}
      <div
        onClick={handleGridClick}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
          columnGap: 8,
          rowGap: 10,
        }}
      >
        {visiblePairs.map(({ system, planet }) => {
          const tfState = terraformStates?.[planet.id];
          const filterStat = getFilterStatLabel(planet, selectedFilter, tfState, t as (key: string) => string, planetResourceStocks, colonyPlanetIds);
          const distLY = colonySystemIds.length > 0
            ? (systemDistances.get(system.id) ?? null)
            : null;
          const isFavorite = favoritePlanetIds?.has(planet.id) ?? false;
          const isSelected = focusedPlanetId === planet.id;
          const menuOpen = menuOpenForId === planet.id;
          const isSurfacePlanet = planet.type === 'rocky' || planet.type === 'terrestrial' || planet.type === 'dwarf';
          const canGoToSurface = isSurfacePlanet && !!onOpenSurface;

          return (
            <React.Fragment key={planet.id}>
              {/* Card cell */}
              <div
                style={{ position: 'relative' }}
                onClick={(e) => e.stopPropagation()}
              >
                <PlanetCard
                  planet={planet}
                  filterStat={filterStat}
                  activeFilter={selectedFilter}
                  isSelected={isSelected}
                  isFavorite={isFavorite}
                  onClick={() => {
                    if (focusedPlanetId === planet.id) {
                      // Second click on same focused card: deselect + close panel
                      setFocusedPlanetId(null);
                      setMenuOpenForId(null);
                    } else {
                      // Click on different card: switch focus, close old menu
                      setFocusedPlanetId(planet.id);
                      setMenuOpenForId(null);
                    }
                  }}
                />
                {menuOpen && (
                  <InlinePlanetMenu
                    planet={planet}
                    system={system}
                    isFavorite={isFavorite}
                    canGoToSurface={canGoToSurface}
                    onViewDetail={() => onViewPlanet(system, planet.id)}
                    onToggleFavorite={() => onToggleFavorite?.(planet.id)}
                    onOpenSurface={() => onOpenSurface?.(system, planet.id)}
                    onClose={() => setMenuOpenForId(null)}
                  />
                )}
              </div>

              {/* Expanded detail panel — spans full grid width, inserted after the focused card */}
              {isSelected && focusedPair && focusedPair.planet.id === planet.id && (
                <ExpandedDetailPanel
                  planet={planet}
                  system={system}
                  distanceLY={distLY !== null && distLY < Infinity ? distLY : null}
                  tfState={tfState}
                  colonyPlanetIds={colonyPlanetIds}
                  donorPlanets={donorPlanets}
                  techTreeState={techTreeState}
                  shipTier={shipTier}
                  getPlanetResources={getPlanetResources}
                  onSendTerraformDelivery={onSendTerraformDelivery}
                  onCompleteTerraform={onCompleteTerraform}
                  onRenamePlanet={onRenamePlanet}
                  onToggleFavorite={onToggleFavorite}
                  isFavorite={isFavorite}
                  onViewPlanet={onViewPlanet}
                  planetResourceStocks={planetResourceStocks}
                  onClose={() => {
                    setFocusedPlanetId(null);
                    setMenuOpenForId(null);
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredPairs.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            color: '#445566',
            fontSize: 12,
            padding: '40px 0',
          }}
        >
          {'\u2014'}
        </div>
      )}

      {/* Lazy load sentinel */}
      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
    </div>
  );
}
