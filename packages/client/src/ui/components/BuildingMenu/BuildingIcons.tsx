import React from 'react';
import type { BuildingType, BuildingCategory } from '@nebulife/core';

const S = 20; // default icon size

// ── Category SVG Icons ───────────────────────────────────────────────────────

const categoryPaths: Record<BuildingCategory, { d: string; color: string }> = {
  infrastructure: {
    d: 'M10 2L2 8v10h6v-5h4v5h6V8L10 2z', // house
    color: '#6699bb',
  },
  energy: {
    d: 'M11 1L5 11h4l-2 8 8-10h-4l2-8z', // lightning
    color: '#ffcc44',
  },
  extraction: {
    d: 'M4 18h12l-2-6h1l-2-5h1L10 2 6 7h1L5 12h1L4 18z', // pickaxe/mountain
    color: '#ff8844',
  },
  science: {
    d: 'M7 2v6H5l5 6 5-6h-2V2H7zm-4 14h14v2H3v-2z', // flask
    color: '#4488ff',
  },
  biosphere: {
    d: 'M10 2C6 2 3 6 3 10c0 3 2 5.5 4 7h6c2-1.5 4-4 4-7 0-4-3-8-7-8zm0 3a3 3 0 013 3c0 1.5-1.5 3-3 5-1.5-2-3-3.5-3-5a3 3 0 013-3z', // leaf
    color: '#44ff88',
  },
  chemistry: {
    d: 'M7 2v5L3 14c-.5 1 0 2.5 1.5 3h11c1.5-.5 2-2 1.5-3L13 7V2H7zm1 6l2 3 2-3', // beaker
    color: '#cc88ff',
  },
};

export function CategoryIcon({ category, size = S }: { category: BuildingCategory; size?: number }) {
  const info = categoryPaths[category];
  if (!info) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d={info.d} fill={info.color} fillOpacity={0.85} />
    </svg>
  );
}

// ── Building Type SVG Icons ──────────────────────────────────────────────────

const buildingIcons: Partial<Record<BuildingType, { d: string; color: string }>> = {
  colony_hub:       { d: 'M10 1L2 7v2l8-5 8 5V7L10 1zM4 10v8h5v-5h2v5h5v-8l-6-4-6 4z', color: '#44ff88' },
  resource_storage: { d: 'M3 5h14v12H3V5zm2 2v3h10V7H5zm0 5v3h10v-3H5z', color: '#8899aa' },
  landing_pad:      { d: 'M3 16h14v2H3v-2zm2-2h10l-1-4H6L5 14zm4-8h2v4H9V6zm-4 0l1 4h1L8 6H5zm7 0l-1 4h1l1-4h-1z', color: '#6699bb' },
  spaceport:        { d: 'M10 1l-2 6H5l3 4-2 7h8l-2-7 3-4h-3L10 1z', color: '#7bb8ff' },
  solar_plant:      { d: 'M2 8h7V3h2v5h7v2h-7v5h-2v-5H2V8zm9-6l2-1m2 3l1-2M9 2L7 1M5 4L4 2m14 8l2-1m-2 5l1 2M4 10L2 9m2 5l-1 2', color: '#ffcc44' },
  battery_station:  { d: 'M5 4h10v14H5V4zm3-2h4v2H8V2zm-1 6h6v2H7v-2zm0 4h4v2H7v-2z', color: '#88cc44' },
  wind_generator:   { d: 'M9 18h2V8l5-5-1-1-4 4V3L10 1 9 3v3L5 2 4 3l5 5v10z', color: '#aaddff' },
  thermal_generator:{ d: 'M5 18h10l-2-5c1-2 2-4 1-6s-2-4-4-4-3 2-4 4-0 4 1 6L5 18zm5-10c1 0 2 1 2 3s-2 4-2 4-2-2-2-4 1-3 2-3z', color: '#ff6633' },
  fusion_reactor:   { d: 'M10 3a7 7 0 100 14 7 7 0 000-14zm0 3a4 4 0 110 8 4 4 0 010-8zm0 2a2 2 0 100 4 2 2 0 000-4z', color: '#44ffdd' },
  mine:             { d: 'M4 18h12l-3-8H7L4 18zm4-10h4l1 2H7l1-2zm2-6v4m-5 0l2 2m6-2l-2 2', color: '#996633' },
  water_extractor:  { d: 'M10 2c-2 3-5 6-5 9a5 5 0 0010 0c0-3-3-6-5-9zm-2 9a2 2 0 004 0', color: '#44bbdd' },
  atmo_extractor:   { d: 'M3 14c0-4 3-7 7-7s7 3 7 7H3zm4-9c1-2 2-3 3-3s2 1 3 3m-6 3a4 4 0 018 0', color: '#88aacc' },
  deep_drill:       { d: 'M8 2h4v3h2l-1 4h-1v3h1l-1 4h-1v2H9v-2H8l-1-4h1V9H7L6 5h2V2z', color: '#cc8844' },
  orbital_collector:{ d: 'M10 3a7 7 0 100 14 7 7 0 000-14zm0 2l3 5H7l3-5zm-2 7h4v3H8v-3z', color: '#6699cc' },
  research_lab:     { d: 'M7 2v6L4 14v2h12v-2l-3-6V2H7zm1 2h4v4l2.5 5h-9L8 8V4zm2 1a1 1 0 100 2 1 1 0 000-2z', color: '#4488ff' },
  observatory:      { d: 'M4 18h12v-2H4v2zm2-4h8l1-3c0-3-2-6-5-6S5 8 5 11l1 3zm5-7v3h-2V7h2z', color: '#9988cc' },
  radar_tower:      { d: 'M9 18h2V9l4-4-1-1-3 3V4l-1-2-1 2v3L6 4 5 5l4 4v9zm-4-4a8 8 0 010-8m10 0a8 8 0 010 8', color: '#66aacc' },
  orbital_telescope:{ d: 'M10 2L6 6l2 2-4 4 2 2 4-4 2 2 4-4-4-4 2-2-4-4zm-5 9l-3 3v4h4l3-3-2-2-2 2z', color: '#aa88ff' },
  quantum_computer: { d: 'M4 4h12v12H4V4zm2 2v8h8V6H6zm2 2h1v1H8V8zm3 0h1v1h-1V8zm-3 3h1v1H8v-1zm3 0h1v1h-1v-1zm-1.5-1.5a1 1 0 100 2 1 1 0 000-2z', color: '#44ddff' },
  greenhouse:       { d: 'M3 18h14v-2H3v2zm1-4h12c0-4-3-8-6-8S4 10 4 14zm6-6c1 0 3 2 3 5H7c0-3 2-5 3-5z', color: '#55bb66' },
  residential_dome: { d: 'M3 16h14v2H3v-2zm1-2c0-5 3-10 6-10s6 5 6 10H4zm3 0h6c0-3-1.5-6-3-6s-3 3-3 6z', color: '#779988' },
  atmo_shield:      { d: 'M10 1C5 1 1 6 1 10h2c0-3 3-7 7-7s7 4 7 7h2c0-4-4-9-9-9zm0 4c-3 0-5 3-5 5h2c0-1 1.5-3 3-3s3 2 3 3h2c0-2-2-5-5-5zm0 8a2 2 0 100-4 2 2 0 000 4z', color: '#44aacc' },
  biome_dome:       { d: 'M2 16h16v2H2v-2zm1-2c0-5 3-10 7-10s7 5 7 10H3zm4-2c1-2 2-4 3-4s2 2 3 4H7zm-2 0c0-1 .5-3 2-5m6 5c0-1-.5-3-2-5', color: '#33cc77' },
  quantum_separator:{ d: 'M6 3h8v3l-2 3v2l2 3v3H6v-3l2-3v-2L6 6V3zm3 5h2v4H9V8z', color: '#cc88ff' },
  gas_fractionator: { d: 'M5 2h3v5c-2 1-3 3-3 5h10c0-2-1-4-3-5V2h3v2h-1v3c1 1 2 3 2 5v3H4v-3c0-2 1-4 2-5V4H5V2z', color: '#88ccff' },
  isotope_centrifuge:{ d: 'M10 3a7 7 0 100 14 7 7 0 000-14zm0 3a4 4 0 110 8 4 4 0 010-8zm0 2.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z', color: '#aacc44' },
  genesis_vault:    { d: 'M10 1l-8 5v2l8-4 8 4V6L10 1zM4 10v6l6 3 6-3v-6l-6 3-6-3z', color: '#ffaa44' },
  alpha_harvester:  { d: 'M10 2l-6 8h4v8h4v-8h4L10 2z', color: '#ddcc44' },
};

export function BuildingIcon({ type, size = S }: { type: BuildingType; size?: number }) {
  const info = buildingIcons[type];
  if (!info) return <CategoryIcon category="infrastructure" size={size} />;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d={info.d} fill={info.color} fillOpacity={0.9} />
    </svg>
  );
}

// ── Resource Icons ───────────────────────────────────────────────────────────

export function MineralIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 1L2 7l3 8h6l3-8L8 1zm0 3l3 3-2 5H7L5 7l3-3z" fill="#ff8844" fillOpacity={0.9} />
    </svg>
  );
}

export function VolatileIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M5 3c-1 2 0 4 1 5s1 3 0 4h4c-1-1-1-3 0-4s2-3 1-5H5zm1 10h4v2H6v-2z" fill="#44ccff" fillOpacity={0.9} />
    </svg>
  );
}

export function IsotopeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" fill="#cc88ff" fillOpacity={0.9} />
      <ellipse cx="8" cy="8" rx="7" ry="3" stroke="#cc88ff" strokeOpacity={0.5} strokeWidth="1" fill="none" />
      <ellipse cx="8" cy="8" rx="3" ry="7" stroke="#cc88ff" strokeOpacity={0.5} strokeWidth="1" fill="none" />
    </svg>
  );
}

export function EnergyIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M9 1L4 8h3l-1 7 6-8H9l1-6z" fill="#ffcc44" fillOpacity={0.9} />
    </svg>
  );
}
