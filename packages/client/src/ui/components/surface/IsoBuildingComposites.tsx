import React from 'react';
import { IsoBlock } from './IsoBlock';
import { gridToSvg, CELL_W, CELL_H } from './surface-svg-utils';
import { BUILDING_DEFS } from '@nebulife/core';
import type { PlacedBuilding } from '@nebulife/core';

// ---------------------------------------------------------------------------
// Building color palette — dark cosmic, aligned with CLAUDE.md game bible
// ---------------------------------------------------------------------------

const B_COLORS: Record<string, { top: string; left: string; right: string; accent?: string }> = {
  colony_hub:         { top: '#5588aa', left: '#335577', right: '#446688', accent: '#44ff88' },
  resource_storage:   { top: '#475569', left: '#334155', right: '#1e293b' },
  landing_pad:        { top: '#88ccaa', left: '#669988', right: '#77bb99' },
  spaceport:          { top: '#aaccee', left: '#7799bb', right: '#88aacc' },
  solar_plant:        { top: '#ffcc44', left: '#cc9922', right: '#ddaa33' },
  battery_station:    { top: '#ffdd88', left: '#ccaa55', right: '#ddbb66' },
  wind_generator:     { top: '#88ddff', left: '#55aacc', right: '#66bbdd' },
  thermal_generator:  { top: '#ff8844', left: '#cc5522', right: '#dd6633' },
  fusion_reactor:     { top: '#ff4466', left: '#cc2244', right: '#dd3355' },
  mine:               { top: '#996633', left: '#774422', right: '#885528', accent: '#f59e0b' },
  water_extractor:    { top: '#44ccff', left: '#2299cc', right: '#33aadd' },
  atmo_extractor:     { top: '#66aacc', left: '#448899', right: '#5599aa' },
  deep_drill:         { top: '#cc8844', left: '#995522', right: '#aa6633' },
  orbital_collector:  { top: '#4466ff', left: '#2244cc', right: '#3355dd' },
  research_lab:       { top: '#4488ff', left: '#2266cc', right: '#3377dd' },
  observatory:        { top: '#cc88ff', left: '#9955cc', right: '#aa66dd' },
  radar_tower:        { top: '#88aaff', left: '#5577cc', right: '#6688dd' },
  orbital_telescope:  { top: '#aa66ff', left: '#7744cc', right: '#8855dd' },
  quantum_computer:   { top: '#dd44ff', left: '#aa22cc', right: '#bb33dd' },
  greenhouse:         { top: '#88ff44', left: '#55cc22', right: '#66dd33' },
  residential_dome:   { top: '#aaffaa', left: '#77cc77', right: '#88dd88' },
  atmo_shield:        { top: '#44ddaa', left: '#22aa77', right: '#33bb88' },
  biome_dome:         { top: '#66ff88', left: '#33cc55', right: '#44dd66' },
  quantum_separator:  { top: '#ff44cc', left: '#cc22aa', right: '#dd33bb' },
  gas_fractionator:   { top: '#44ffcc', left: '#22ccaa', right: '#33ddbb' },
  isotope_centrifuge: { top: '#ffcc88', left: '#cc9955', right: '#ddaa66' },
  genesis_vault:      { top: '#88ffcc', left: '#55ccaa', right: '#66ddbb' },
  alpha_harvester:    { top: '#ffcc44', left: '#cc9922', right: '#ddaa33', accent: '#ff4444' },
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

interface RecessedNeonProps {
  x: number; y: number; w: number; h: number; depth: number;
  dy: number; length: number; isRightSide?: boolean; glowColor?: string;
}

function RecessedNeon({ x, y, w, h, depth, dy, length, isRightSide = false, glowColor = '#22d3ee' }: RecessedNeonProps) {
  const topY = y - depth;
  const startY = topY + dy;
  const endY = startY + length;
  const y1 = 1;
  const y2 = w / 2 - 1;

  if (!isRightSide) {
    return (
      <g>
        <polygon points={`${x - w + 2},${startY + y1} ${x - 2},${startY + y2} ${x - 2},${endY + y2} ${x - w + 2},${endY + y1}`} fill="#020617" />
        <line x1={x - w + 2} y1={startY + y1} x2={x - 2} y2={startY + y2} stroke="#000" strokeWidth={2} strokeOpacity={0.8} />
        <line x1={x - w + 4} y1={startY + y1 + length / 2} x2={x - 4} y2={startY + y2 + length / 2} stroke={glowColor} strokeWidth={2.5} className="svg-engine-glow" />
      </g>
    );
  }
  return (
    <g>
      <polygon points={`${x + 2},${startY + y2} ${x + w - 2},${startY + y1} ${x + w - 2},${endY + y1} ${x + 2},${endY + y2}`} fill="#020617" />
      <line x1={x + 2} y1={startY + y2} x2={x + w - 2} y2={startY + y1} stroke="#000" strokeWidth={2} strokeOpacity={0.8} />
      <line x1={x + 4} y1={startY + y2 + length / 2} x2={x + w - 4} y2={startY + y1 + length / 2} stroke={glowColor} strokeWidth={2.5} className="svg-engine-glow" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Detail sub-components
// ---------------------------------------------------------------------------

/** Colony Hub: premium 2x2 compound — central spire + side blocks + neon windows */
function ColonyHubDetail({ x, y }: { x: number; y: number }) {
  const subW = 14;
  const subH = 7;
  const platDepth = 4;

  // 2x2 layout around center
  const blocks = [
    { rx: -1, ry: 0, h: 20, type: 'side' },
    { rx: 0, ry: -1, h: 26, type: 'side' },
    { rx: 0, ry: 0, h: 52, type: 'spire' },
    { rx: 1, ry: 0, h: 17, type: 'side' },
    { rx: 0, ry: 1, h: 22, type: 'side' },
  ].sort((a, b) => (a.rx + a.ry) - (b.rx + b.ry));

  return (
    <g>
      {/* Foundation */}
      <IsoBlock x={x} y={y} w={CELL_W * 1.2} h={CELL_H * 1.2} depth={platDepth}
        topColor="#1e293b" leftColor="#0f172a" rightColor="#020617" />

      {blocks.map((b, i) => {
        const bx = x + (b.rx - b.ry) * subW;
        const by = y - platDepth + (b.rx + b.ry) * subH;
        const isSpire = b.type === 'spire';

        return (
          <g key={i}>
            <IsoBlock x={bx} y={by} w={subW} h={subH} depth={b.h}
              topColor={isSpire ? '#f8fafc' : '#38bdf8'}
              leftColor={isSpire ? '#e2e8f0' : '#0ea5e9'}
              rightColor={isSpire ? '#cbd5e1' : '#0284c7'}
              windowColor={isSpire ? '#22d3ee' : undefined}
            />
            {isSpire && (
              <>
                {/* Radar dome on roof */}
                <ellipse cx={bx} cy={by - b.h - subH} rx={subW * 0.5} ry={subH * 0.5}
                  fill="none" stroke="#22d3ee" strokeWidth="1.5" className="svg-engine-glow" />
                <circle cx={bx} cy={by - b.h - subH} r={1.5} fill="#ffffff" />
                {/* Antenna + green beacon */}
                <line x1={bx} y1={by - b.h - subH} x2={bx} y2={by - b.h - subH - 16}
                  stroke="#cbd5e1" strokeWidth="1.5" />
                <line x1={bx - 4} y1={by - b.h - subH - 10} x2={bx + 4} y2={by - b.h - subH - 10}
                  stroke="#94a3b8" strokeWidth="1" />
                <circle cx={bx} cy={by - b.h - subH - 16} r={2} fill="#44ff88"
                  className="svg-engine-glow" />
              </>
            )}
            {!isSpire && (
              <circle cx={bx} cy={by - b.h - subH} r={1} fill="#22d3ee" opacity="0.7" />
            )}
          </g>
        );
      })}
    </g>
  );
}

/** Resource Storage: 2x1 dual silos with neon level gauges + cargo containers */
function ResourceStorageDetail({ x, y }: { x: number; y: number }) {
  const subW = 16;
  const subH = 8;
  const platDepth = 8;
  const rearX = x;
  const rearY = y;
  const frontX = x + subW;
  const frontY = y + subH;
  const roofYR = rearY - platDepth;
  const roofYF = frontY - platDepth;

  const P = {
    dark:  { t: '#475569', l: '#334155', r: '#1e293b' },
    light: { t: '#f8fafc', l: '#e2e8f0', r: '#cbd5e1' },
    black: { t: '#1e293b', l: '#0f172a', r: '#020617' },
    blue:  { t: '#38bdf8', l: '#0ea5e9', r: '#0284c7' },
    yellow:{ t: '#facc15', l: '#eab308', r: '#ca8a04' },
    orange:{ t: '#f97316', l: '#c2410c', r: '#9a3412' },
  };

  return (
    <g>
      {/* Foundation 2x1 */}
      <IsoBlock x={rearX} y={rearY} w={20} h={10} depth={platDepth} topColor={P.black.t} leftColor={P.black.l} rightColor={P.black.r} />
      <IsoBlock x={frontX} y={frontY} w={20} h={10} depth={platDepth} topColor={P.black.t} leftColor={P.black.l} rightColor={P.black.r} />

      {/* Rear silo */}
      <IsoBlock x={rearX} y={roofYR} w={14} h={7} depth={45} topColor={P.light.t} leftColor={P.light.l} rightColor={P.light.r} />
      <RecessedNeon x={rearX} y={roofYR} w={14} h={7} depth={45} dy={8} length={30} glowColor="#44ff88" />
      <RecessedNeon x={rearX} y={roofYR} w={14} h={7} depth={45} dy={8} length={30} isRightSide glowColor="#44ff88" />
      <IsoBlock x={rearX} y={roofYR - 45} w={10} h={5} depth={6} topColor={P.dark.t} leftColor={P.dark.l} rightColor={P.dark.r} />
      <circle cx={rearX} cy={roofYR - 53} r={2} fill="#44ff88" className="svg-engine-glow" />

      {/* Pipeline connector */}
      <IsoBlock x={x + subW / 2} y={roofYR + 8} w={6} h={3} depth={15} topColor={P.dark.t} leftColor={P.dark.l} rightColor={P.dark.r} />
      <line x1={x + subW / 2 - 6} y1={roofYR + 2} x2={x + subW / 2 + 4} y2={roofYR + 6} stroke="#020617" strokeWidth={4} strokeLinecap="round" />
      <line x1={x + subW / 2 - 6} y1={roofYR + 2} x2={x + subW / 2 + 4} y2={roofYR + 6} stroke="#22d3ee" strokeWidth={1.5} strokeLinecap="round" className="svg-engine-glow" />

      {/* Pump terminal */}
      <IsoBlock x={frontX - 14} y={roofYF + 6} w={8} h={4} depth={20} topColor={P.blue.t} leftColor={P.blue.l} rightColor={P.blue.r} />
      <RecessedNeon x={frontX - 14} y={roofYF + 6} w={8} h={4} depth={20} dy={5} length={10} glowColor="#22d3ee" />

      {/* Front silo */}
      <IsoBlock x={frontX} y={roofYF} w={14} h={7} depth={45} topColor={P.light.t} leftColor={P.light.l} rightColor={P.light.r} />
      <RecessedNeon x={frontX} y={roofYF} w={14} h={7} depth={45} dy={8} length={30} glowColor="#44ff88" />
      <RecessedNeon x={frontX} y={roofYF} w={14} h={7} depth={45} dy={8} length={30} isRightSide glowColor="#44ff88" />
      <IsoBlock x={frontX} y={roofYF - 45} w={10} h={5} depth={6} topColor={P.dark.t} leftColor={P.dark.l} rightColor={P.dark.r} />
      <circle cx={frontX} cy={roofYF - 53} r={2} fill="#44ff88" className="svg-engine-glow" />

      {/* Cargo containers */}
      <IsoBlock x={frontX + 16} y={roofYF + 10} w={6} h={3} depth={10} topColor={P.yellow.t} leftColor={P.yellow.l} rightColor={P.yellow.r} />
      <IsoBlock x={frontX + 10} y={roofYF + 16} w={5} h={2.5} depth={6} topColor={P.orange.t} leftColor={P.orange.l} rightColor={P.orange.r} />
    </g>
  );
}

/** Mine: tall thin tower block + smoke circles */
function MineDetail({ x, y }: { x: number; y: number }) {
  const towerW = CELL_W * 0.3;
  const towerH = CELL_H * 0.3;
  const towerDepth = 18;
  const towerY = y - 2;

  return (
    <g>
      {/* Derrick tower */}
      <IsoBlock
        x={x} y={towerY}
        w={towerW} h={towerH}
        depth={towerDepth}
        topColor="#aa7744"
        leftColor="#885522"
        rightColor="#996633"
      />
      {/* Smoke particles */}
      <circle
        cx={x + 2} cy={towerY - towerDepth - 4}
        r={3}
        fill="#445566"
        opacity={0.5}
        className="svg-smoke-1"
      />
      <circle
        cx={x - 1} cy={towerY - towerDepth - 8}
        r={2}
        fill="#445566"
        opacity={0.35}
        className="svg-smoke-2"
      />
    </g>
  );
}

/** Solar Plant: bright reflective flat panel on top */
function SolarDetail({ x, y }: { x: number; y: number }) {
  // Solar panel plate helper
  const SolarPlate = ({ px, py, pw, ph, pd }: { px: number; py: number; pw: number; ph: number; pd: number }) => {
    const topY = py - pd;
    return (
      <g>
        <IsoBlock x={px} y={py} w={pw} h={ph} depth={pd} topColor="#0ea5e9" leftColor="#0284c7" rightColor="#0369a1" />
        {/* Grid lines on panel */}
        <line x1={px - pw + 4} y1={topY} x2={px + pw - 4} y2={topY} stroke="#22d3ee" strokeWidth="0.5" opacity="0.3" />
        <line x1={px} y1={topY - ph + 3} x2={px} y2={topY + ph - 3} stroke="#22d3ee" strokeWidth="0.5" opacity="0.3" />
      </g>
    );
  };

  // Two rear panels on tall poles + two front panels on short poles
  const rearPanels = [{ dx: -8, dy: -4, pole: 14 }, { dx: 8, dy: -4, pole: 14 }];
  const frontPanels = [{ dx: -4, dy: 6, pole: 8 }, { dx: 12, dy: 6, pole: 8 }];

  return (
    <g>
      {/* Rear panels (behind control block) */}
      {rearPanels.map((p, i) => (
        <g key={`rp${i}`}>
          <line x1={x + p.dx} y1={y + p.dy} x2={x + p.dx} y2={y + p.dy - p.pole} stroke="#64748b" strokeWidth="2" />
          <SolarPlate px={x + p.dx} py={y + p.dy - p.pole} pw={12} ph={6} pd={2} />
        </g>
      ))}
      {/* Control tower (center) */}
      <IsoBlock x={x + 2} y={y} w={6} h={3} depth={14} topColor="#38bdf8" leftColor="#0ea5e9" rightColor="#0284c7" />
      <circle cx={x + 2} cy={y - 17} r={1.5} fill="#22d3ee" className="svg-engine-glow" />
      <line x1={x + 2} y1={y - 14} x2={x + 2} y2={y - 24} stroke="#94a3b8" strokeWidth="1" />
      <circle cx={x + 2} cy={y - 24} r={1} fill="#facc15" className="svg-engine-glow" />
      {/* Front panels (overlap control block) */}
      {frontPanels.map((p, i) => (
        <g key={`fp${i}`}>
          <line x1={x + p.dx} y1={y + p.dy} x2={x + p.dx} y2={y + p.dy - p.pole} stroke="#64748b" strokeWidth="2" />
          <SolarPlate px={x + p.dx} py={y + p.dy - p.pole} pw={12} ph={6} pd={2} />
        </g>
      ))}
      {/* Battery block */}
      <IsoBlock x={x + 16} y={y + 8} w={5} h={2.5} depth={8} topColor="#f97316" leftColor="#c2410c" rightColor="#9a3412" />
      <circle cx={x + 16} cy={y - 2} r={1} fill="#44ff88" className="svg-engine-glow" />
    </g>
  );
}

/** Observatory: dome arc + purple glow ring */
function ObservatoryDetail({ x, y }: { x: number; y: number }) {
  const domeRx = CELL_W * 0.55;
  const domeRy = CELL_W * 0.3;
  const domeY = y - 2;

  return (
    <g>
      {/* Dome body — elliptical arc */}
      <ellipse
        cx={x} cy={domeY}
        rx={domeRx} ry={domeRy}
        fill="#9944cc"
        opacity={0.75}
        stroke="#bb66ee"
        strokeWidth="0.8"
        strokeOpacity="0.6"
      />
      {/* Dome upper highlight */}
      <ellipse
        cx={x - domeRx * 0.25} cy={domeY - domeRy * 0.35}
        rx={domeRx * 0.3} ry={domeRy * 0.3}
        fill="#dd99ff"
        opacity={0.25}
      />
      {/* Aperture slot */}
      <line
        x1={x} y1={domeY - domeRy}
        x2={x} y2={domeY + domeRy * 0.2}
        stroke="#220033"
        strokeWidth="2"
        strokeOpacity="0.8"
      />
      {/* Purple glow ring */}
      <ellipse
        cx={x} cy={domeY + domeRy * 0.15}
        rx={domeRx * 1.1} ry={domeRy * 0.25}
        fill="none"
        stroke="#cc88ff"
        strokeWidth="1"
        strokeOpacity="0.4"
        className="svg-engine-glow"
      />
    </g>
  );
}

/** Radar Tower: tall vertical mast + dish ring */
function RadarTowerDetail({ x, y }: { x: number; y: number }) {
  const mastY = y - 2;
  const mastTop = mastY - 22;

  return (
    <g>
      {/* Mast */}
      <line
        x1={x} y1={mastY}
        x2={x} y2={mastTop}
        stroke="#6688cc"
        strokeWidth="1.5"
        strokeOpacity="0.9"
      />
      {/* Dish — tilted ellipse */}
      <ellipse
        cx={x} cy={mastTop + 4}
        rx={7} ry={3}
        fill="#445588"
        stroke="#88aaff"
        strokeWidth="0.7"
        strokeOpacity="0.7"
        transform={`rotate(-20, ${x}, ${mastTop + 4})`}
      />
      {/* Scan glow */}
      <circle
        cx={x} cy={mastTop}
        r={2}
        fill="#88aaff"
        opacity={0.7}
        className="svg-engine-glow"
      />
    </g>
  );
}

/** Fusion Reactor: toroid ring + plasma glow */
function FusionReactorDetail({ x, y }: { x: number; y: number }) {
  // Reactor tower (tall center block)
  const towerW = CELL_W * 0.5;
  const towerH = CELL_H * 0.5;
  const towerDepth = 20;
  const towerY = y - 2;
  const topY = towerY - towerDepth;

  return (
    <g>
      {/* Main reactor tower */}
      <IsoBlock
        x={x} y={towerY}
        w={towerW} h={towerH}
        depth={towerDepth}
        topColor="#e2e8f0"
        leftColor="#cbd5e1"
        rightColor="#94a3b8"
      />
      {/* Neon strips on left face */}
      <line x1={x - towerW + 2} y1={topY + 5} x2={x - 2} y2={topY + towerH + 3} stroke="#22d3ee" strokeWidth="2" opacity="0.7" className="svg-engine-glow" />
      <line x1={x - towerW + 2} y1={topY + 11} x2={x - 2} y2={topY + towerH + 9} stroke="#22d3ee" strokeWidth="2" opacity="0.7" className="svg-engine-glow" />
      {/* Neon strips on right face */}
      <line x1={x + 2} y1={topY + towerH + 3} x2={x + towerW - 2} y2={topY + 5} stroke="#22d3ee" strokeWidth="2" opacity="0.7" className="svg-engine-glow" />
      <line x1={x + 2} y1={topY + towerH + 9} x2={x + towerW - 2} y2={topY + 11} stroke="#22d3ee" strokeWidth="2" opacity="0.7" className="svg-engine-glow" />
      {/* Reactor dome cap */}
      <polygon
        points={`${x},${topY - towerH - 2} ${x + towerW},${topY - 2} ${x},${topY + towerH - 2} ${x - towerW},${topY - 2}`}
        fill="#020617"
      />
      <ellipse cx={x} cy={topY - 2} rx={towerW * 0.6} ry={towerH * 0.6} fill="none" stroke="#22d3ee" strokeWidth="1.5" className="svg-engine-glow" />
      <circle cx={x} cy={topY - 2} r={1.5} fill="#ffffff" />
      {/* Antenna */}
      <line x1={x - 4} y1={topY - 2} x2={x - 4} y2={topY - 14} stroke="#94a3b8" strokeWidth="1" />
      <circle cx={x - 4} cy={topY - 14} r={1} fill="#f97316" className="svg-engine-glow" />
    </g>
  );
}

/** Greenhouse: arched transparent roof */
function GreenhouseDetail({ x, y }: { x: number; y: number }) {
  const roofY = y - 2;
  const rw = CELL_W * 0.75;
  const rh = CELL_H * 0.75;

  return (
    <g>
      {/* Arch top face */}
      <ellipse
        cx={x} cy={roofY}
        rx={rw} ry={rh * 0.6}
        fill="#44aa22"
        opacity={0.5}
        stroke="#88ff44"
        strokeWidth="0.7"
        strokeOpacity="0.6"
      />
      {/* Internal green glow */}
      <ellipse
        cx={x} cy={roofY + 1}
        rx={rw * 0.55} ry={rh * 0.3}
        fill="#66ff33"
        opacity={0.15}
      />
    </g>
  );
}

/** Residential Dome: large rounded dome with window dots */
function ResidentialDomeDetail({ x, y }: { x: number; y: number }) {
  const domeY = y - 2;
  const dw = CELL_W * 0.7;
  const dh = CELL_H * 0.55;

  return (
    <g>
      <ellipse
        cx={x} cy={domeY}
        rx={dw} ry={dh}
        fill="#77cc77"
        opacity={0.55}
        stroke="#aaffaa"
        strokeWidth="0.8"
        strokeOpacity="0.5"
      />
      {/* Window lights */}
      <circle cx={x - 5} cy={domeY + 2} r={1.2} fill="#ddffd4" opacity={0.8} />
      <circle cx={x}     cy={domeY + 3} r={1.2} fill="#ddffd4" opacity={0.8} />
      <circle cx={x + 5} cy={domeY + 2} r={1.2} fill="#ddffd4" opacity={0.8} />
    </g>
  );
}

/** Wind Generator: thin mast + three rotor blades */
function WindGeneratorDetail({ x, y }: { x: number; y: number }) {
  const mastTop = y - 20;

  return (
    <g>
      {/* Mast */}
      <line
        x1={x} y1={y - 2}
        x2={x} y2={mastTop}
        stroke="#66bbdd"
        strokeWidth="1.2"
        strokeOpacity="0.9"
      />
      {/* Three rotor blades at 120-degree offsets */}
      {[0, 120, 240].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const bx = x + Math.cos(rad) * 9;
        const by = mastTop + Math.sin(rad) * 5;
        return (
          <line
            key={deg}
            x1={x} y1={mastTop}
            x2={bx} y2={by}
            stroke="#88ddff"
            strokeWidth="1.5"
            strokeOpacity="0.8"
            strokeLinecap="round"
          />
        );
      })}
      {/* Hub dot */}
      <circle cx={x} cy={mastTop} r={1.5} fill="#aaeeff" opacity={0.9} />
    </g>
  );
}

/** Deep Drill: drill bit cone + depth lines */
function DeepDrillDetail({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Vertical shaft */}
      <line
        x1={x} y1={y - 2}
        x2={x} y2={y - 16}
        stroke="#cc8844"
        strokeWidth="2"
        strokeOpacity="0.8"
      />
      {/* Drill bit cone */}
      <polygon
        points={`${x - 4},${y - 16} ${x + 4},${y - 16} ${x},${y - 22}`}
        fill="#ffaa55"
        opacity={0.85}
      />
      {/* Depth tick marks */}
      <line x1={x - 3} y1={y - 6}  x2={x + 3} y2={y - 6}  stroke="#cc8844" strokeWidth="0.8" strokeOpacity="0.5" />
      <line x1={x - 3} y1={y - 10} x2={x + 3} y2={y - 10} stroke="#cc8844" strokeWidth="0.8" strokeOpacity="0.5" />
    </g>
  );
}

/** Orbital Collector: satellite dish + orbit ring */
function OrbitalCollectorDetail({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Orbit ring */}
      <ellipse
        cx={x} cy={y - 8}
        rx={12} ry={5}
        fill="none"
        stroke="#4466ff"
        strokeWidth="1"
        strokeOpacity="0.6"
        strokeDasharray="3 2"
        className="svg-engine-glow"
      />
      {/* Satellite body */}
      <circle
        cx={x + 10} cy={y - 9}
        r={2.5}
        fill="#3355dd"
        stroke="#6688ff"
        strokeWidth="0.7"
      />
      {/* Solar panel stub */}
      <line
        x1={x + 10} y1={y - 9}
        x2={x + 10} y2={y - 14}
        stroke="#4488ff"
        strokeWidth="1"
        strokeOpacity="0.7"
      />
    </g>
  );
}

/** Water Extractor: wide collection bowl + cylindrical tank + condenser unit */
function WaterExtractorDetail({ x, y }: { x: number; y: number }) {
  const tankW = 9;
  const tankH = 4.5;
  const tankDepth = 18;
  const tankY = y - 2;
  const topY  = tankY - tankDepth;

  const bowlCY = topY - tankH - 4;
  const bowlRx = 13;
  const bowlRy = 6.5;

  return (
    <g>
      {/* Main storage tank */}
      <IsoBlock x={x} y={tankY} w={tankW} h={tankH} depth={tankDepth}
        topColor="#44ccff" leftColor="#2299cc" rightColor="#33aadd" />

      {/* Water-level neon strips */}
      <RecessedNeon x={x} y={tankY} w={tankW} h={tankH} depth={tankDepth}
        dy={5} length={9} glowColor="#88eeff" />
      <RecessedNeon x={x} y={tankY} w={tankW} h={tankH} depth={tankDepth}
        dy={5} length={9} isRightSide glowColor="#88eeff" />

      {/* Condenser unit (right-front) */}
      <IsoBlock x={x + tankW + 3} y={tankY + 6} w={5} h={2.5} depth={14}
        topColor="#1e88bb" leftColor="#0f5577" rightColor="#1a6688" />

      {/* Pipe connector: shadow + neon glow */}
      <line x1={x + tankW - 1} y1={topY + 8} x2={x + tankW + 3} y2={topY + 11}
        stroke="#020617" strokeWidth={3} strokeLinecap="round" />
      <line x1={x + tankW - 1} y1={topY + 8} x2={x + tankW + 3} y2={topY + 11}
        stroke="#44ccff" strokeWidth={1.5} strokeLinecap="round"
        className="svg-engine-glow" />

      {/* Condenser status beacon */}
      <circle cx={x + tankW + 3} cy={tankY + 6 - 14 - 2.5 - 2} r={1.5}
        fill="#44ccff" className="svg-engine-glow" />

      {/* Support column bowl → tank */}
      <line x1={x} y1={topY - tankH} x2={x} y2={bowlCY + bowlRy}
        stroke="#1e6688" strokeWidth="2" />

      {/* Collection bowl: outer metal rim */}
      <ellipse cx={x} cy={bowlCY} rx={bowlRx} ry={bowlRy}
        fill="#0a2233" stroke="#44ccff" strokeWidth="1.8" strokeOpacity="0.95" />

      {/* Inner water pool */}
      <ellipse cx={x} cy={bowlCY} rx={bowlRx * 0.72} ry={bowlRy * 0.72}
        fill="#1a4466" opacity="0.88" />

      {/* Water surface shimmer ring */}
      <ellipse cx={x} cy={bowlCY} rx={bowlRx * 0.52} ry={bowlRy * 0.52}
        fill="none" stroke="#66ddff" strokeWidth="1.2"
        strokeOpacity="0.65" className="svg-engine-glow" />

      {/* Specular highlight */}
      <ellipse cx={x - bowlRx * 0.3} cy={bowlCY - bowlRy * 0.3}
        rx={bowlRx * 0.18} ry={bowlRy * 0.18}
        fill="#aaeeff" opacity="0.2" />

      {/* Water beacon above bowl */}
      <circle cx={x} cy={bowlCY - bowlRy - 4} r={2}
        fill="#88eeff" className="svg-engine-glow" />
    </g>
  );
}

/** Genesis Vault: tall vault with arc + glow */
function GenesisVaultDetail({ x, y }: { x: number; y: number }) {
  const vaultY = y - 2;

  return (
    <g>
      {/* Arc crown */}
      <path
        d={`M ${x - 10},${vaultY} A 10 10 0 0 1 ${x + 10},${vaultY}`}
        fill="#55ccaa"
        stroke="#88ffcc"
        strokeWidth="0.8"
        strokeOpacity="0.7"
        opacity={0.7}
      />
      {/* Glow halo */}
      <circle
        cx={x} cy={vaultY - 4}
        r={5}
        fill="none"
        stroke="#88ffcc"
        strokeWidth="1.5"
        strokeOpacity="0.4"
        className="svg-engine-glow"
      />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Main IsoBuilding component
// ---------------------------------------------------------------------------

interface IsoBuildingProps {
  building: PlacedBuilding;
  isNew?: boolean;
}

export const IsoBuilding = React.memo(function IsoBuilding({
  building,
  isNew,
}: IsoBuildingProps) {
  const def = BUILDING_DEFS[building.type];
  const colors = B_COLORS[building.type] ?? { top: '#778899', left: '#556677', right: '#667788' };

  const sizeW = def?.sizeW ?? 1;
  const sizeH = def?.sizeH ?? 1;
  const baseH = 4; // thin platform for all buildings

  // Block half-extents for this building footprint
  const blockW = (CELL_W * sizeW) / 2;
  const blockH = (CELL_H * sizeW) / 2;

  const cx = building.x + (sizeW - 1) / 2;
  const cy = building.y + (sizeH - 1) / 2;
  const { x, y } = gridToSvg(cx, cy);

  return (
    <g className={isNew ? 'svg-building-new' : undefined}>
      {/* Base block */}
      <IsoBlock
        x={x} y={y}
        w={blockW} h={blockH}
        depth={baseH}
        topColor={colors.top}
        leftColor={colors.left}
        rightColor={colors.right}
      />

      {/* Per-type structural details */}
      {building.type === 'colony_hub' && (
        <ColonyHubDetail x={x} y={y - baseH} />
      )}
      {building.type === 'resource_storage' && (
        <ResourceStorageDetail x={x} y={y - baseH} />
      )}
      {building.type === 'mine' && (
        <MineDetail x={x} y={y - baseH} />
      )}
      {building.type === 'solar_plant' && (
        <SolarDetail x={x} y={y - baseH} />
      )}
      {building.type === 'observatory' && (
        <ObservatoryDetail x={x} y={y - baseH} />
      )}
      {building.type === 'radar_tower' && (
        <RadarTowerDetail x={x} y={y - baseH} />
      )}
      {building.type === 'fusion_reactor' && (
        <FusionReactorDetail x={x} y={y - baseH} />
      )}
      {building.type === 'greenhouse' && (
        <GreenhouseDetail x={x} y={y - baseH} />
      )}
      {building.type === 'residential_dome' && (
        <ResidentialDomeDetail x={x} y={y - baseH} />
      )}
      {building.type === 'biome_dome' && (
        <ResidentialDomeDetail x={x} y={y - baseH} />
      )}
      {building.type === 'wind_generator' && (
        <WindGeneratorDetail x={x} y={y - baseH} />
      )}
      {building.type === 'deep_drill' && (
        <DeepDrillDetail x={x} y={y - baseH} />
      )}
      {building.type === 'orbital_collector' && (
        <OrbitalCollectorDetail x={x} y={y - baseH} />
      )}
      {building.type === 'orbital_telescope' && (
        <OrbitalCollectorDetail x={x} y={y - baseH} />
      )}
      {building.type === 'genesis_vault' && (
        <GenesisVaultDetail x={x} y={y - baseH} />
      )}

      {/* Accent dot for types with an accent color but no custom detail */}
      {colors.accent &&
        building.type !== 'colony_hub' &&
        building.type !== 'mine' &&
        building.type !== 'alpha_harvester' && (
          <circle
            cx={x}
            cy={y - baseH - 4}
            r={2}
            fill={colors.accent}
            opacity={0.7}
          />
        )}

      {/* Alpha Harvester: spinning harvest beam */}
      {building.type === 'alpha_harvester' && (
        <g>
          <circle
            cx={x} cy={y - baseH - 3}
            r={5}
            fill="none"
            stroke="#ff4444"
            strokeWidth="1.2"
            strokeOpacity="0.6"
            className="svg-engine-glow"
          />
          <circle
            cx={x} cy={y - baseH - 3}
            r={2}
            fill="#ffcc44"
            opacity={0.9}
            className="svg-engine-glow"
          />
        </g>
      )}
    </g>
  );
});
