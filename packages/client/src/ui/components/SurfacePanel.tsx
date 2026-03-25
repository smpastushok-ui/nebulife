import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { BuildingType, PlacedBuilding, TechTreeState } from '@nebulife/core';
import type { Planet } from '@nebulife/core';
import { BUILDING_DEFS, canBuildOnPlanet, createTechTreeState } from '@nebulife/core';

// ---------------------------------------------------------------------------
// SurfacePanel — Variant C (Floating HUD)
// ---------------------------------------------------------------------------

type DockMode = 'build' | 'colony';

/* ─── Building groups ───────────────────────────────────────────────────── */

interface BuildingGroup { label: string; color: string; types: BuildingType[] }

const BUILDING_GROUPS: BuildingGroup[] = [
  { label: 'ІНФРАСТРУКТУРА', color: '#44ff88',  types: ['colony_hub', 'resource_storage', 'landing_pad', 'spaceport'] },
  { label: 'ЕНЕРГЕТИКА',     color: '#ffcc44',  types: ['solar_plant', 'battery_station', 'wind_generator', 'thermal_generator', 'fusion_reactor'] },
  { label: 'ВИДОБУТОК',      color: '#ff8844',  types: ['mine', 'water_extractor', 'atmo_extractor', 'deep_drill', 'orbital_collector'] },
  { label: 'НАУКА',          color: '#4488ff',  types: ['research_lab', 'observatory', 'radar_tower', 'orbital_telescope', 'quantum_computer'] },
  { label: 'БІОСФЕРА',       color: '#88ff44',  types: ['greenhouse', 'residential_dome', 'atmo_shield', 'biome_dome'] },
  { label: 'ХІМІЯ',          color: '#ff44aa',  types: ['quantum_separator', 'gas_fractionator', 'isotope_centrifuge', 'genesis_vault'] },
  { label: 'ПРЕМІУМ',        color: '#ffcc44',  types: ['alpha_harvester'] },
];

const BUILDING_COLORS: Partial<Record<BuildingType, string>> = {
  colony_hub:        '#44ff88',
  resource_storage:  '#66bb88',
  landing_pad:       '#88ccaa',
  spaceport:         '#aaccee',
  solar_plant:       '#ffcc44',
  battery_station:   '#ffdd88',
  wind_generator:    '#88ddff',
  thermal_generator: '#ff8844',
  fusion_reactor:    '#ff4466',
  mine:              '#ff8844',
  water_extractor:   '#44ccff',
  atmo_extractor:    '#66aacc',
  deep_drill:        '#cc8844',
  orbital_collector: '#4466ff',
  research_lab:      '#4488ff',
  observatory:       '#cc88ff',
  radar_tower:       '#88aaff',
  orbital_telescope: '#aa66ff',
  quantum_computer:  '#dd44ff',
  greenhouse:        '#88ff44',
  residential_dome:  '#aaffaa',
  atmo_shield:       '#44ddaa',
  biome_dome:        '#66ff88',
  quantum_separator: '#ff44aa',
  gas_fractionator:  '#ff6688',
  isotope_centrifuge:'#cc4488',
  genesis_vault:     '#ff88cc',
  alpha_harvester:   '#ffcc44',
};

const TERRAIN_UA: Record<string, string> = {
  lowland:   'низовина',
  plains:    'рівнина',
  hills:     'пагорби',
  beach:     'пляж',
  coast:     'узбережжя',
  ocean:     'океан',
  mountains: 'гори',
  peaks:     'вершини',
};

/* ─── PNG photo paths (where available) ────────────────────────────────── */

const BLDG_PNG: Partial<Record<BuildingType, string>> = {
  colony_hub:       '/buildings/colony_hub.png',
  solar_plant:      '/buildings/solar_plant.png',
  battery_station:  '/buildings/battery_station.png',
  wind_generator:       '/buildings/wind_generator.png',
  thermal_generator:    '/buildings/thermal_generator.png',
  resource_storage:     '/tiles/machines/resource_storage.png',
  landing_pad:      '/tiles/machines/landing_pad.png',
  spaceport:        '/tiles/machines/spaceport.png',
  alpha_harvester:  '/tiles/machines/premium_harvester_drone.png',
};

/* ─── 3-resource cost display (МІН / ЛЕТ / ІЗО) ───────────────────────── */

interface ResCost { m: number; v: number; i: number }

const BLDG_COSTS: Record<BuildingType, ResCost> = {
  // Infrastructure
  colony_hub:         { m:50,  v:20, i:10 },
  resource_storage:   { m:30,  v:0,  i:0  },
  landing_pad:        { m:40,  v:5,  i:5  },
  spaceport:          { m:80,  v:30, i:20 },
  // Energy
  solar_plant:        { m:20,  v:0,  i:5  },
  battery_station:    { m:25,  v:0,  i:15 },
  wind_generator:     { m:20,  v:10, i:0  },
  thermal_generator:  { m:30,  v:20, i:5  },
  fusion_reactor:     { m:50,  v:10, i:40 },
  // Extraction
  mine:               { m:15,  v:0,  i:0  },
  water_extractor:    { m:15,  v:10, i:0  },
  atmo_extractor:     { m:25,  v:15, i:0  },
  deep_drill:         { m:40,  v:5,  i:5  },
  orbital_collector:  { m:50,  v:10, i:20 },
  // Science
  research_lab:       { m:20,  v:5,  i:15 },
  observatory:        { m:25,  v:0,  i:20 },
  radar_tower:        { m:30,  v:5,  i:10 },
  orbital_telescope:  { m:40,  v:5,  i:30 },
  quantum_computer:   { m:50,  v:0,  i:50 },
  // Biosphere
  greenhouse:         { m:20,  v:15, i:0  },
  residential_dome:   { m:35,  v:10, i:5  },
  atmo_shield:        { m:50,  v:15, i:20 },
  biome_dome:         { m:45,  v:25, i:15 },
  // Chemistry
  quantum_separator:  { m:30,  v:10, i:20 },
  gas_fractionator:   { m:35,  v:30, i:10 },
  isotope_centrifuge: { m:40,  v:5,  i:35 },
  genesis_vault:      { m:100, v:50, i:80 },
  // Premium (costs quarks — shown separately)
  alpha_harvester:    { m:0,   v:0,  i:0  },
};

/* ─── Canvas mini-icon (fallback for buildings without PNG) ─────────────── */

function drawIcon(ctx: CanvasRenderingContext2D, type: BuildingType, size: number) {
  const cx = size / 2, cy = size / 2, s = size * 0.35;
  const col = BUILDING_COLORS[type] ?? '#aabbcc';
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = col;
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  switch (type) {
    case 'colony_hub':
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.9);
      ctx.lineTo(cx + s * 0.7, cy - s * 0.1);
      ctx.lineTo(cx + s * 0.7, cy + s * 0.6);
      ctx.lineTo(cx - s * 0.7, cy + s * 0.6);
      ctx.lineTo(cx - s * 0.7, cy - s * 0.1);
      ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'mine':
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.7);
      ctx.lineTo(cx + s * 0.6, cy + s * 0.6);
      ctx.lineTo(cx - s * 0.6, cy + s * 0.6);
      ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'solar_plant':
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.7); ctx.lineTo(cx + s * 0.6, cy);
      ctx.lineTo(cx, cy + s * 0.7); ctx.lineTo(cx - s * 0.6, cy);
      ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'research_lab':
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.55, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.2, 0, Math.PI * 2); ctx.fill(); break;
    case 'water_extractor':
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.8);
      ctx.quadraticCurveTo(cx + s * 0.7, cy, cx, cy + s * 0.6);
      ctx.quadraticCurveTo(cx - s * 0.7, cy, cx, cy - s * 0.8);
      ctx.fill(); ctx.stroke(); break;
    case 'greenhouse':
      ctx.beginPath();
      ctx.arc(cx, cy + s * 0.1, s * 0.55, Math.PI, 0);
      ctx.lineTo(cx + s * 0.55, cy + s * 0.5);
      ctx.lineTo(cx - s * 0.55, cy + s * 0.5);
      ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'observatory':
      ctx.beginPath();
      ctx.arc(cx, cy - s * 0.15, s * 0.4, Math.PI, 0);
      ctx.lineTo(cx + s * 0.3, cy + s * 0.5);
      ctx.lineTo(cx - s * 0.3, cy + s * 0.5);
      ctx.lineTo(cx - s * 0.4, cy - s * 0.15);
      ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'thermal_generator': {
      // Base body
      ctx.fillStyle = '#1a1008';
      ctx.strokeStyle = col + '66';
      ctx.lineWidth = 1;
      ctx.fillRect(cx - s * 0.65, cy - s * 0.3, s * 1.3, s * 0.9);
      ctx.strokeRect(cx - s * 0.65, cy - s * 0.3, s * 1.3, s * 0.9);
      // Molten core glow (slightly above centre)
      const coreY = cy - s * 0.1;
      const g = ctx.createRadialGradient(cx, coreY, 0, cx, coreY, s * 0.55);
      g.addColorStop(0,   'rgba(255,200,60,0.95)');
      g.addColorStop(0.3, 'rgba(255,80,15,0.75)');
      g.addColorStop(0.7, 'rgba(180,20,5,0.30)');
      g.addColorStop(1,   'rgba(100,10,0,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, coreY, s * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // Solid core
      ctx.fillStyle = '#ff5533';
      ctx.beginPath(); ctx.arc(cx, coreY, s * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe8a0';
      ctx.beginPath(); ctx.arc(cx - s * 0.05, coreY - s * 0.05, s * 0.07, 0, Math.PI * 2); ctx.fill();
      break;
    }
    // ── ЕНЕРГЕТИКА ─────────────────────────────────────────────────────────
    case 'battery_station': {
      // Прямокутник-акумулятор + "плюс" зверху
      ctx.strokeStyle = col + 'cc';
      ctx.fillRect(cx - s * 0.55, cy - s * 0.15, s * 1.1, s * 0.75);
      ctx.strokeRect(cx - s * 0.55, cy - s * 0.15, s * 1.1, s * 0.75);
      ctx.fillRect(cx - s * 0.2, cy - s * 0.4, s * 0.4, s * 0.28);
      // charge stripe
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(cx - s * 0.3, cy, s * 0.6, s * 0.2);
      break;
    }
    case 'wind_generator': {
      // 3 лопаті + втулка
      ctx.strokeStyle = col + 'aa';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * s * 0.8, cy + Math.sin(a) * s * 0.8);
        ctx.lineTo(cx + Math.cos(a + 0.5) * s * 0.3, cy + Math.sin(a + 0.5) * s * 0.3);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.14, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'fusion_reactor': {
      // Тор: два концентричних кола + хрест-ліній
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.65, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.65); ctx.lineTo(cx, cy + s * 0.65); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - s * 0.65, cy); ctx.lineTo(cx + s * 0.65, cy); ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    // ── ВИДОБУТОК ──────────────────────────────────────────────────────────
    case 'deep_drill': {
      // Трикутник вниз + вертикальна лінія (бур)
      ctx.strokeStyle = col + 'cc';
      ctx.beginPath();
      ctx.moveTo(cx, cy + s * 0.8);
      ctx.lineTo(cx + s * 0.5, cy - s * 0.3);
      ctx.lineTo(cx - s * 0.5, cy - s * 0.3);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(cx - s * 0.08, cy - s * 0.7, s * 0.16, s * 0.4);
      break;
    }
    case 'atmo_extractor': {
      // Трубка вертикальна + 3 бульбашки
      ctx.strokeStyle = col + 'cc';
      ctx.fillRect(cx - s * 0.12, cy - s * 0.5, s * 0.24, s * 0.8);
      ctx.strokeRect(cx - s * 0.12, cy - s * 0.5, s * 0.24, s * 0.8);
      for (let i = 0; i < 3; i++) {
        const by = cy - s * 0.5 - i * s * 0.28;
        ctx.globalAlpha = 0.6 - i * 0.15;
        ctx.beginPath(); ctx.arc(cx + (i % 2 ? s * 0.28 : -s * 0.28), by, s * 0.13, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'orbital_collector': {
      // Кільце з 4 сегментами
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.6, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.6, a + 0.1, a + Math.PI / 2 - 0.1);
        ctx.lineWidth = 4; ctx.stroke(); ctx.lineWidth = 2;
      }
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.18, 0, Math.PI * 2); ctx.fill();
      break;
    }
    // ── НАУКА ──────────────────────────────────────────────────────────────
    case 'radar_tower': {
      // 3 дуги (сигнал) + вертикальна лінія
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 1 - i * 0.2;
        ctx.beginPath();
        ctx.arc(cx, cy + s * 0.4, s * i * 0.28, Math.PI + 0.3, -0.3);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.4); ctx.lineTo(cx, cy - s * 0.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - s * 0.4, cy + s * 0.6); ctx.lineTo(cx + s * 0.4, cy + s * 0.6); ctx.stroke();
      break;
    }
    case 'orbital_telescope': {
      // Циліндр + лінза
      ctx.strokeStyle = col + 'cc';
      ctx.fillRect(cx - s * 0.18, cy - s * 0.6, s * 0.36, s * 0.85);
      ctx.strokeRect(cx - s * 0.18, cy - s * 0.6, s * 0.36, s * 0.85);
      ctx.beginPath(); ctx.arc(cx, cy - s * 0.6, s * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      break;
    }
    case 'quantum_computer': {
      // Сітка 3×3 точок + рамка
      ctx.strokeStyle = col + 'aa';
      ctx.strokeRect(cx - s * 0.6, cy - s * 0.6, s * 1.2, s * 1.2);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const px = cx - s * 0.4 + c * s * 0.4;
          const py = cy - s * 0.4 + r * s * 0.4;
          ctx.globalAlpha = 0.5 + Math.random() * 0.5;
          ctx.beginPath(); ctx.arc(px, py, s * 0.1, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      // connection lines
      ctx.strokeStyle = col + '66'; ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.4, cy - s * 0.4); ctx.lineTo(cx + s * 0.4, cy + s * 0.4);
      ctx.moveTo(cx + s * 0.4, cy - s * 0.4); ctx.lineTo(cx - s * 0.4, cy + s * 0.4);
      ctx.stroke();
      break;
    }
    // ── БІОСФЕРА ───────────────────────────────────────────────────────────
    case 'residential_dome':
    case 'atmo_shield':
    case 'biome_dome': {
      // Напівкуля + хвиляста лінія знизу
      ctx.strokeStyle = col + 'cc';
      ctx.beginPath();
      ctx.arc(cx, cy + s * 0.2, s * 0.65, Math.PI, 0);
      ctx.lineTo(cx + s * 0.65, cy + s * 0.2);
      ctx.lineTo(cx - s * 0.65, cy + s * 0.2);
      ctx.fill(); ctx.stroke();
      // хвиля
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.6, cy + s * 0.5);
      for (let x = -s * 0.6; x <= s * 0.6; x += s * 0.15) {
        ctx.lineTo(cx + x, cy + s * 0.5 + Math.sin((x / s) * Math.PI * 2) * s * 0.1);
      }
      ctx.lineTo(cx + s * 0.6, cy + s * 0.7);
      ctx.lineTo(cx - s * 0.6, cy + s * 0.7);
      ctx.fill();
      break;
    }
    // ── ХІМІЯ ──────────────────────────────────────────────────────────────
    case 'quantum_separator': {
      // Стрілки, що розходяться з центру
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      const arrows = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
      for (const [dx, dy] of arrows) {
        const ex = cx + dx * s * 0.6;
        const ey = cy + dy * s * 0.6;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
        // стрілочний кінець
        const a = Math.atan2(ey - cy, ex - cx);
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - Math.cos(a - 0.4) * s * 0.2, ey - Math.sin(a - 0.4) * s * 0.2);
        ctx.lineTo(ex - Math.cos(a + 0.4) * s * 0.2, ey - Math.sin(a + 0.4) * s * 0.2);
        ctx.closePath(); ctx.fill();
      }
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.15, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'gas_fractionator': {
      // Циліндр + 3 горизонтальні лінії
      ctx.strokeStyle = col + 'cc';
      ctx.fillRect(cx - s * 0.45, cy - s * 0.5, s * 0.9, s * 1.0);
      ctx.strokeRect(cx - s * 0.45, cy - s * 0.5, s * 0.9, s * 1.0);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const ly = cy - s * 0.15 + i * s * 0.25;
        ctx.beginPath(); ctx.moveTo(cx - s * 0.35, ly); ctx.lineTo(cx + s * 0.35, ly); ctx.stroke();
      }
      break;
    }
    case 'isotope_centrifuge': {
      // Спіраль з 3 дуг
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const r = s * (0.25 + i * 0.2);
        const a0 = (i * 2 * Math.PI) / 3;
        ctx.beginPath(); ctx.arc(cx, cy, r, a0, a0 + Math.PI * 1.5); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.1, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'genesis_vault': {
      // Спіраль ДНК — 2 зигзаг-лінії
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      const pts1: [number, number][] = [];
      const pts2: [number, number][] = [];
      for (let i = 0; i <= 8; i++) {
        const t  = i / 8;
        const y  = cy - s * 0.7 + t * s * 1.4;
        const x1 = cx + Math.sin(t * Math.PI * 2.5) * s * 0.45;
        const x2 = cx - Math.sin(t * Math.PI * 2.5) * s * 0.45;
        pts1.push([x1, y]); pts2.push([x2, y]);
      }
      ctx.beginPath();
      pts1.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
      ctx.beginPath();
      pts2.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
      // bridge lines
      ctx.strokeStyle = col + '66'; ctx.lineWidth = 1;
      for (let i = 1; i < 8; i += 2) {
        ctx.beginPath(); ctx.moveTo(pts1[i][0], pts1[i][1]); ctx.lineTo(pts2[i][0], pts2[i][1]); ctx.stroke();
      }
      break;
    }
    // ── ІНФРАСТРУКТУРА (PNG fallback icons) ────────────────────────────────
    case 'resource_storage': {
      // Стопка 3 прямокутників
      ctx.strokeStyle = col + 'cc';
      for (let i = 0; i < 3; i++) {
        const y = cy + s * 0.5 - i * s * 0.42;
        ctx.fillRect(cx - s * 0.55 + i * s * 0.05, y - s * 0.3, s * (1.1 - i * 0.1), s * 0.28);
        ctx.strokeRect(cx - s * 0.55 + i * s * 0.05, y - s * 0.3, s * (1.1 - i * 0.1), s * 0.28);
      }
      break;
    }
    case 'landing_pad': {
      // Коло + хрест (цільовий майданчик)
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.65, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.35, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.65); ctx.lineTo(cx, cy + s * 0.65); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - s * 0.65, cy); ctx.lineTo(cx + s * 0.65, cy); ctx.stroke();
      break;
    }
    case 'spaceport': {
      // Ракета: трикутник + прямокутник
      ctx.strokeStyle = col + 'cc';
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.75);
      ctx.lineTo(cx + s * 0.35, cy - s * 0.1);
      ctx.lineTo(cx - s * 0.35, cy - s * 0.1);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillRect(cx - s * 0.22, cy - s * 0.1, s * 0.44, s * 0.65);
      ctx.strokeRect(cx - s * 0.22, cy - s * 0.1, s * 0.44, s * 0.65);
      // бокові крила
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.22, cy + s * 0.2); ctx.lineTo(cx - s * 0.55, cy + s * 0.55); ctx.lineTo(cx - s * 0.22, cy + s * 0.55);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.22, cy + s * 0.2); ctx.lineTo(cx + s * 0.55, cy + s * 0.55); ctx.lineTo(cx + s * 0.22, cy + s * 0.55);
      ctx.closePath(); ctx.fill();
      break;
    }
    case 'alpha_harvester': {
      // Ромб + 4 промені
      ctx.strokeStyle = col + 'cc';
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.55);
      ctx.lineTo(cx + s * 0.4, cy);
      ctx.lineTo(cx, cy + s * 0.55);
      ctx.lineTo(cx - s * 0.4, cy);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 1.5; ctx.strokeStyle = col;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * s * 0.55, cy + Math.sin(a) * s * 0.55);
        ctx.lineTo(cx + Math.cos(a) * s * 0.85, cy + Math.sin(a) * s * 0.85);
        ctx.stroke();
      }
      break;
    }
    default: break;
  }
}

function BuildingIcon({ type, size = 24 }: { type: BuildingType; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawIcon(ctx, type, size);
  }, [type, size]);
  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ width: size, height: size, flexShrink: 0 }}
    />
  );
}

/* ─── Building card (photo + name + cost + ? for description) ───────────── */

const IMG_SIZE = 62;

function BuildingCard({
  type,
  selected,
  onClick,
  locked,
  lockReason,
  currentCount,
}: {
  type: BuildingType;
  selected: boolean;
  onClick: () => void;
  locked?: boolean;
  lockReason?: string;
  currentCount?: number;
}) {
  const [descOpen, setDescOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [hovered, setHovered] = useState(false);

  const def        = BUILDING_DEFS[type];
  const col        = BUILDING_COLORS[type] ?? '#aabbcc';
  const cost       = BLDG_COSTS[type];
  const pngPath    = BLDG_PNG[type];
  const terrainStr = def.requiresTerrain.map((t) => TERRAIN_UA[t] ?? t).join(', ');
  const isPremium  = type === 'alpha_harvester';
  const atLimit    = def.maxPerPlanet > 0 && (currentCount ?? 0) >= def.maxPerPlanet;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'flex-start', gap: 10,
        width: '100%', padding: '8px 10px',
        background: selected ? 'rgba(40,80,120,0.35)' : 'transparent',
        border: 'none',
        borderBottom: '1px solid rgba(40,60,80,0.25)',
        borderLeft: `3px solid ${locked ? '#1a2535' : selected ? col : 'transparent'}`,
        cursor: 'pointer', textAlign: 'left',
        fontFamily: 'monospace',
        transition: 'background 0.1s, border-color 0.1s',
      }}
    >
      {/* ── Content wrapper (dimmed when locked) ─────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        width: '100%',
        opacity: locked ? (hovered ? 0.50 : 0.35) : 1,
        transition: 'opacity 0.15s ease',
      }}>
        {/* ── Building photo / icon ───────────────────────────────────── */}
        <div style={{
          width: IMG_SIZE, height: IMG_SIZE, flexShrink: 0,
          border: `1px solid ${col}33`,
          borderRadius: 3, overflow: 'hidden',
          background: '#ffffff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {pngPath && !imgFailed ? (
            <img
              src={pngPath}
              alt={type}
              onError={() => setImgFailed(true)}
              style={{
                width: '100%', height: '100%', objectFit: 'contain', display: 'block',
                mixBlendMode: 'multiply',
              }}
            />
          ) : (
            <BuildingIcon type={type} size={IMG_SIZE - 14} />
          )}
        </div>

        {/* ── Name / cost / description ─────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Name row + ? button */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 4,
            marginBottom: 5,
          }}>
            <span style={{
              color: selected ? '#cce8ff' : '#aabbcc',
              fontSize: 12, lineHeight: 1.3,
            }}>
              {def.name}
            </span>
            {/* ? toggles description inline */}
            <span
              role="button"
              onMouseEnter={() => setDescOpen(true)}
              onMouseLeave={() => setDescOpen(false)}
              onClick={(e) => { e.stopPropagation(); setDescOpen((p) => !p); }}
              style={{
                color: descOpen ? '#aabbcc' : '#334455',
                fontSize: 9, cursor: 'pointer',
                border: `1px solid ${descOpen ? '#445566' : '#2a3a4a'}`,
                borderRadius: 2, padding: '1px 5px',
                lineHeight: '13px', flexShrink: 0,
                userSelect: 'none',
                transition: 'color 0.1s, border-color 0.1s',
              }}
            >
              ?
            </span>
          </div>

          {/* Description — shown when ? is active */}
          {descOpen && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ color: '#667788', fontSize: 10, lineHeight: 1.5 }}>
                {def.description}
              </div>
              <div style={{ color: '#3a4e5e', fontSize: 9, marginTop: 3 }}>
                {terrainStr}&nbsp;&nbsp;{def.sizeW}&times;{def.sizeH}
              </div>
            </div>
          )}

          {/* Resource costs + count/limit */}
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
            {isPremium ? (
              <span style={{ color: '#ffcc44', fontSize: 10 }}>ПРЕМІУМ</span>
            ) : (
              <>
                {cost.m > 0 && (
                  <span style={{ color: '#6699bb', fontSize: 10 }}>
                    М:{cost.m}
                  </span>
                )}
                {cost.v > 0 && (
                  <span style={{ color: '#44ccff', fontSize: 10 }}>
                    Л:{cost.v}
                  </span>
                )}
                {cost.i > 0 && (
                  <span style={{ color: '#88ff44', fontSize: 10 }}>
                    І:{cost.i}
                  </span>
                )}
                {cost.m === 0 && cost.v === 0 && cost.i === 0 && (
                  <span style={{ color: '#3a4e5e', fontSize: 10 }}>—</span>
                )}
              </>
            )}
            {/* Count / limit indicator */}
            {def.maxPerPlanet > 0 && (
              <span style={{
                color: atLimit ? '#cc4444' : '#4a5e70',
                fontSize: 9, marginLeft: 'auto',
              }}>
                {currentCount ?? 0}/{def.maxPerPlanet}
              </span>
            )}
          </div>

        </div>
      </div>

      {/* ── Lock overlay (diagonal hatch + reason text) ────────────── */}
      {locked && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `repeating-linear-gradient(
            -45deg,
            rgba(10,15,25,0.80) 0px,
            rgba(10,15,25,0.80) 2px,
            rgba(20,30,50,0.45) 2px,
            rgba(20,30,50,0.45) 6px
          )`,
          opacity: hovered ? 0.75 : 1,
          transition: 'opacity 0.15s ease',
          borderRadius: 0,
          pointerEvents: 'none', // clicks pass through to button
        }}>
          {lockReason && (
            <span style={{
              color: '#667788', fontSize: 10,
              fontFamily: 'monospace',
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              letterSpacing: '0.3px',
            }}>
              {lockReason}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

/* ─── Planet info HUD (top-left, always visible) ───────────────────────── */

function PlanetInfoHUD({ planet, buildings }: { planet: Planet; buildings: PlacedBuilding[] }) {
  const [expanded, setExpanded] = useState(false);

  const tempC = Math.round(planet.surfaceTempK - 273);
  const tempColor = tempC > -10 && tempC < 50 ? '#44ff88' : tempC < -40 || tempC > 80 ? '#ff8844' : '#ffcc44';
  const habPct = Math.round((planet.habitability?.overall ?? 0) * 100);
  const habColor = habPct > 70 ? '#44ff88' : habPct > 40 ? '#ffcc44' : '#ff8844';
  const gravColor = Math.abs(planet.surfaceGravityG - 1) < 0.3 ? '#44ff88' : '#ffcc44';
  const tempStr = `${tempC > 0 ? '+' : ''}${tempC}°C`;

  // ── Collapsed bar ──────────────────────────────────────────────────────
  if (!expanded) {
    return (
      <div
        onClick={() => setExpanded(true)}
        style={{
          position: 'absolute', top: 14, left: 14,
          background: 'rgba(5,10,25,0.88)',
          border: '1px solid rgba(60,100,160,0.3)',
          borderRadius: 4, padding: '5px 10px',
          display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: 'monospace', cursor: 'pointer', pointerEvents: 'auto',
          userSelect: 'none',
        }}
      >
        <span style={{ color: '#aaccee', fontSize: 11, letterSpacing: '0.5px' }}>
          {planet.name.toUpperCase()}
        </span>
        <span style={{ color: tempColor, fontSize: 11 }}>{tempStr}</span>
        <span style={{ color: '#4a5e70', fontSize: 10 }}>&#9658;</span>
      </div>
    );
  }

  // ── Expanded panel ─────────────────────────────────────────────────────
  const rows: { k: string; v: string; c: string }[] = [
    { k: 'Температура', v: tempStr, c: tempColor },
    { k: 'Гравітація',  v: `${planet.surfaceGravityG.toFixed(2)} g`, c: gravColor },
    ...(planet.atmosphere
      ? [{ k: 'Атмосфера', v: `${planet.atmosphere.surfacePressureAtm.toFixed(1)} атм`, c: '#aabbcc' }]
      : []),
    { k: 'Придатність', v: `${habPct}%`, c: habColor },
    { k: 'Споруд',      v: String(buildings.length), c: '#aabbcc' },
  ];

  return (
    <div style={{
      position: 'absolute', top: 14, left: 14,
      background: 'rgba(5,10,25,0.88)',
      border: '1px solid rgba(60,100,160,0.3)',
      borderRadius: 4, padding: '8px 12px',
      fontFamily: 'monospace', pointerEvents: 'auto',
      minWidth: 175,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ color: '#aaccee', fontSize: 11, letterSpacing: '0.7px' }}>
          {planet.name.toUpperCase()}
        </span>
        <button
          onClick={() => setExpanded(false)}
          style={{
            background: 'none', border: 'none', color: '#4a5e70',
            fontSize: 10, cursor: 'pointer', fontFamily: 'monospace',
            padding: '0 0 0 8px', lineHeight: 1,
          }}
        >
          &#9660;
        </button>
      </div>
      {rows.map(({ k, v, c }) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
          <span style={{ color: '#4a5e70', fontSize: 10 }}>{k}</span>
          <span style={{ color: c, fontSize: 10 }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Placement hint (top-center, when building selected) ──────────────── */

function PlacementHint({ type, onCancel }: { type: BuildingType; onCancel: () => void }) {
  const def = BUILDING_DEFS[type];
  const col = BUILDING_COLORS[type] ?? '#aabbcc';
  return (
    <div style={{
      position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(5,20,15,0.92)',
      border: `1px solid ${col}33`,
      borderRadius: 4, padding: '6px 14px',
      fontFamily: 'monospace', fontSize: 11, color: '#88ccaa',
      display: 'flex', alignItems: 'center', gap: 10,
      pointerEvents: 'auto', whiteSpace: 'nowrap', zIndex: 10,
    }}>
      <span style={{ color: col, fontSize: 13, lineHeight: 1 }}>+</span>
      <span style={{ color: '#aabbcc' }}>{def.name}</span>
      <span style={{ color: '#445566' }}>—</span>
      <span style={{ color: '#556677' }}>оберіть клітинку на карті</span>
      <button
        onClick={onCancel}
        style={{
          background: 'none', border: 'none', color: '#556677',
          fontSize: 14, cursor: 'pointer', fontFamily: 'monospace',
          padding: '0 2px', lineHeight: 1,
        }}
      >
        &times;
      </button>
    </div>
  );
}

/* ─── Building list content ─────────────────────────────────────────────── */

function BuildingListContent({
  mode, planet, buildings,
  selectedBuilding, onSelectBuilding,
  expandedGroups, toggleGroup,
  playerLevel, techTreeState,
}: {
  mode: DockMode;
  planet: Planet;
  buildings: PlacedBuilding[];
  selectedBuilding: BuildingType | null;
  onSelectBuilding: (t: BuildingType | null) => void;
  expandedGroups: Set<string>;
  toggleGroup: (label: string) => void;
  playerLevel: number;
  techTreeState?: TechTreeState;
}) {
  // Building counts for availability checks
  const buildingCounts = useMemo(() =>
    buildings.reduce<Record<string, number>>((acc, b) => {
      acc[b.type] = (acc[b.type] ?? 0) + 1;
      return acc;
    }, {}),
  [buildings]);

  const techState = techTreeState ?? createTechTreeState();

  if (mode === 'build') {
    return (
      <>
        {BUILDING_GROUPS.map((group) => {
          const isExpanded = expandedGroups.has(group.label);
          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '5px 12px',
                  background: 'none', border: 'none',
                  borderTop: '1px solid rgba(40,60,80,0.4)',
                  color: group.color, fontFamily: 'monospace',
                  fontSize: 9, letterSpacing: '0.7px', cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ flex: 1 }}>{group.label}</span>
                <span style={{ color: '#334455', fontSize: 12 }}>
                  {isExpanded ? '−' : '+'}
                </span>
              </button>

              {isExpanded && group.types.map((type) => {
                const avail = canBuildOnPlanet(type, planet, playerLevel, techState, buildingCounts);
                const count = buildingCounts[type] ?? 0;
                return (
                  <BuildingCard
                    key={type}
                    type={type}
                    selected={selectedBuilding === type}
                    onClick={() => onSelectBuilding(selectedBuilding === type ? null : type)}
                    locked={!avail.available}
                    lockReason={avail.reason}
                    currentCount={count}
                  />
                );
              })}
            </div>
          );
        })}
      </>
    );
  }

  /* ── Colony mode — stats + placed buildings ── */
  const tempC = Math.round(planet.surfaceTempK - 273);
  const habPct = Math.round((planet.habitability?.overall ?? 0) * 100);
  const habColor = habPct > 70 ? '#44ff88' : habPct > 40 ? '#ffcc44' : '#ff8844';

  return (
    <div>
      {[
        { k: 'Температура', v: `${tempC > 0 ? '+' : ''}${tempC}°C` },
        { k: 'Гравітація',  v: `${planet.surfaceGravityG.toFixed(2)} g` },
        ...(planet.atmosphere
          ? [{ k: 'Атмосфера', v: `${planet.atmosphere.surfacePressureAtm.toFixed(1)} атм` }]
          : []),
        { k: 'Придатність', v: `${habPct}%`, c: habColor },
        { k: 'Споруд', v: String(buildings.length) },
      ].map(({ k, v, c }) => (
        <div key={k} style={{
          display: 'flex', justifyContent: 'space-between', gap: 16,
          padding: '6px 12px', borderBottom: '1px solid rgba(40,60,80,0.2)',
        }}>
          <span style={{ color: '#667788', fontSize: 11 }}>{k}</span>
          <span style={{ color: (c as string | undefined) ?? '#aaccee', fontSize: 11 }}>{v}</span>
        </div>
      ))}

      <div style={{
        padding: '7px 12px 4px',
        color: '#4488aa', fontSize: 9, letterSpacing: '0.7px',
        marginTop: 4,
      }}>
        РОЗМІЩЕНІ СПОРУДИ
      </div>

      {buildings.length === 0 ? (
        <div style={{ padding: '10px 12px', color: '#3a4e5e', fontSize: 10, lineHeight: 1.7 }}>
          Жодної споруди не зведено.<br />
          Оберіть тип у вкладці БУДІВЛІ.
        </div>
      ) : buildings.map((b) => {
        const def = BUILDING_DEFS[b.type];
        const col = BUILDING_COLORS[b.type] ?? '#aabbcc';
        return (
          <div key={b.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 12px', borderBottom: '1px solid rgba(40,60,80,0.2)',
            borderLeft: `3px solid ${col}55`,
          }}>
            <BuildingIcon type={b.type} size={20} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#aabbcc', fontSize: 11 }}>{def.name}</div>
              <div style={{ color: '#445566', fontSize: 9 }}>x:{b.x}  y:{b.y}</div>
            </div>
            <div style={{
              fontSize: 9, color: col,
              padding: '2px 5px',
              border: `1px solid ${col}44`,
              borderRadius: 2, letterSpacing: '0.3px',
            }}>
              LV{b.level}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Icon dock (right side) ───────────────────────────────────────────── */

function IconDock({
  mode, panelOpen, harvestMode, onToggle, onToggleHarvest,
}: {
  mode: DockMode;
  panelOpen: boolean;
  harvestMode: boolean;
  onToggle: (m: DockMode) => void;
  onToggleHarvest: () => void;
}) {
  const dockBtn = (
    active: boolean,
    title: string,
    icon: React.ReactNode,
    onClick: () => void,
    accentColor?: string,
  ) => (
    <button
      key={title}
      onClick={onClick}
      title={title}
      style={{
        width: 36, height: 36,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? (accentColor ? `${accentColor}22` : 'rgba(20,50,80,0.9)') : 'rgba(10,15,25,0.85)',
        border: `1px solid ${active ? (accentColor ?? 'rgba(68,136,170,0.6)') : 'rgba(60,100,160,0.25)'}`,
        borderRadius: 4, cursor: 'pointer',
        color: active ? (accentColor ?? '#aaccee') : '#556677',
        fontFamily: 'monospace', padding: 0,
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {icon}
    </button>
  );

  return (
    <div style={{
      position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
      display: 'flex', flexDirection: 'column', gap: 6,
      pointerEvents: 'auto',
    }}>
      {dockBtn(
        harvestMode, 'Добування',
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <line x1="3" y1="13" x2="10" y2="6" />
          <path d="M10 6 L13 3 L14 4 L11 7 Z" />
          <path d="M10 6 L8 4 L9 2 L12 5" />
        </svg>,
        onToggleHarvest,
        '#ff8844',
      )}

      <div style={{ height: 1, background: 'rgba(60,100,160,0.2)', margin: '2px 4px' }} />

      {dockBtn(
        panelOpen && mode === 'build', 'Будівлі',
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
          <rect x="1" y="1" width="6" height="6" rx="1" />
          <rect x="9" y="1" width="6" height="6" rx="1" />
          <rect x="1" y="9" width="6" height="6" rx="1" />
          <rect x="9" y="9" width="6" height="6" rx="1" />
        </svg>,
        () => onToggle('build'),
      )}
      {dockBtn(
        panelOpen && mode === 'colony', 'Колонія',
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
          <line x1="2" y1="4" x2="14" y2="4" />
          <line x1="2" y1="8" x2="14" y2="8" />
          <line x1="2" y1="12" x2="14" y2="12" />
        </svg>,
        () => onToggle('colony'),
      )}
    </div>
  );
}

/* ─── Props ─────────────────────────────────────────────────────────────── */

interface SurfacePanelProps {
  planet: Planet;
  buildings: PlacedBuilding[];
  selectedBuilding: BuildingType | null;
  onSelectBuilding: (type: BuildingType | null) => void;
  onClose: () => void;
  harvestMode: boolean;
  onToggleHarvest: () => void;
  playerLevel: number;
  techTreeState?: TechTreeState;
}

/* ─── Main panel ─────────────────────────────────────────────────────────── */

export function SurfacePanel({
  planet,
  buildings,
  selectedBuilding,
  onSelectBuilding,
  onClose,
  harvestMode,
  onToggleHarvest,
  playerLevel,
  techTreeState,
}: SurfacePanelProps) {
  const [mode, setMode] = useState<DockMode>('build');
  const [panelOpen, setPanelOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(BUILDING_GROUPS.map((g) => g.label)),
  );

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  useEffect(() => {
    if (selectedBuilding && window.innerWidth < 768) {
      setPanelOpen(false);
    }
  }, [selectedBuilding]);

  const handleDockToggle = (m: DockMode) => {
    if (mode === m) {
      setPanelOpen((p) => !p);
    } else {
      setMode(m);
      setPanelOpen(true);
    }
  };

  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none',
      zIndex: 100,
    }}>
      <PlanetInfoHUD planet={planet} buildings={buildings} />

      {selectedBuilding && (
        <PlacementHint type={selectedBuilding} onCancel={() => onSelectBuilding(null)} />
      )}

      {panelOpen && (
        <div style={{
          position: 'absolute',
          right: 60, top: 60,
          width: 305,
          maxHeight: 'calc(100vh - 130px)',
          background: 'rgba(5,10,25,0.94)',
          border: '1px solid rgba(60,100,160,0.3)',
          borderRadius: 4,
          fontFamily: 'monospace',
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'auto',
        }}>
          <div style={{
            padding: '7px 12px',
            borderBottom: '1px solid rgba(60,100,160,0.2)',
            color: '#4488aa', fontSize: 9, letterSpacing: '0.8px',
            flexShrink: 0,
          }}>
            {mode === 'build' ? 'БУДІВЛІ' : 'КОЛОНІЯ'}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <BuildingListContent
              mode={mode}
              planet={planet}
              buildings={buildings}
              selectedBuilding={selectedBuilding}
              onSelectBuilding={onSelectBuilding}
              expandedGroups={expandedGroups}
              toggleGroup={toggleGroup}
              playerLevel={playerLevel}
              techTreeState={techTreeState}
            />
          </div>
        </div>
      )}

      {harvestMode && !selectedBuilding && (
        <div style={{
          position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(25,15,5,0.92)',
          border: '1px solid rgba(255,136,68,0.3)',
          borderRadius: 4, padding: '6px 14px',
          fontFamily: 'monospace', fontSize: 11, color: '#cc8855',
          display: 'flex', alignItems: 'center', gap: 10,
          pointerEvents: 'auto', whiteSpace: 'nowrap', zIndex: 10,
        }}>
          <span style={{ color: '#ff8844', fontSize: 13, lineHeight: 1 }}>*</span>
          <span style={{ color: '#aabbcc' }}>Режим добування</span>
          <span style={{ color: '#445566' }}>—</span>
          <span style={{ color: '#556677' }}>натисніть на ресурс</span>
          <button
            onClick={onToggleHarvest}
            style={{
              background: 'none', border: 'none', color: '#556677',
              fontSize: 14, cursor: 'pointer', fontFamily: 'monospace',
              padding: '0 2px', lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>
      )}

      <IconDock
        mode={mode}
        panelOpen={panelOpen}
        harvestMode={harvestMode}
        onToggle={handleDockToggle}
        onToggleHarvest={onToggleHarvest}
      />
    </div>
  );
}
