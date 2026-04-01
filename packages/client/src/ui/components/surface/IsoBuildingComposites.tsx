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
  resource_storage:   { top: '#66bb88', left: '#448866', right: '#559977' },
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
// Detail sub-components
// ---------------------------------------------------------------------------

/** Colony Hub: upper smaller block + antenna spire + green glow dot */
function ColonyHubDetail({ x, y }: { x: number; y: number }) {
  // Upper tier block — smaller, centered
  const tierW = CELL_W * 0.6;
  const tierH = CELL_H * 0.6;
  const tierDepth = 8;
  const tierY = y - 4;

  return (
    <g>
      {/* Upper tier block */}
      <IsoBlock
        x={x} y={tierY}
        w={tierW} h={tierH}
        depth={tierDepth}
        topColor="#6699bb"
        leftColor="#446688"
        rightColor="#5577aa"
      />
      {/* Antenna base */}
      <line
        x1={x} y1={tierY - tierDepth - 2}
        x2={x} y2={tierY - tierDepth - 14}
        stroke="#88bbdd"
        strokeWidth="1"
        strokeOpacity="0.9"
      />
      {/* Crossbar */}
      <line
        x1={x - 4} y1={tierY - tierDepth - 10}
        x2={x + 4} y2={tierY - tierDepth - 10}
        stroke="#88bbdd"
        strokeWidth="0.8"
        strokeOpacity="0.7"
      />
      {/* Green glow beacon */}
      <circle
        cx={x} cy={tierY - tierDepth - 14}
        r={2}
        fill="#44ff88"
        opacity={0.9}
        className="svg-engine-glow"
      />
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
  // Flat panel — wide, zero depth, bright gold
  const panelW = CELL_W * 0.9;
  const panelH = CELL_H * 0.9;
  const panelY = y - 2;

  return (
    <g>
      {/* Panel surface */}
      <IsoBlock
        x={x} y={panelY}
        w={panelW} h={panelH}
        depth={0}
        topColor="#ffe066"
        leftColor="#ccaa22"
        rightColor="#ddbb33"
      />
      {/* Reflection highlight */}
      <polygon
        points={`${x - panelW * 0.5},${panelY - panelH * 0.3} ${x},${panelY - panelH * 0.8} ${x + panelW * 0.3},${panelY - panelH * 0.1}`}
        fill="#ffffff"
        opacity={0.12}
      />
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
  const ringY = y - 4;

  return (
    <g>
      {/* Reactor ring — two offset ellipses for toroid illusion */}
      <ellipse
        cx={x} cy={ringY}
        rx={10} ry={5}
        fill="none"
        stroke="#ff4466"
        strokeWidth="2.5"
        strokeOpacity="0.8"
        className="svg-engine-glow"
      />
      <ellipse
        cx={x} cy={ringY}
        rx={6} ry={3}
        fill="#ff224488"
        stroke="#ff8899"
        strokeWidth="1"
        strokeOpacity="0.5"
      />
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
  const { x, y } = gridToSvg(building.x, building.y);
  const def = BUILDING_DEFS[building.type];
  const colors = B_COLORS[building.type] ?? { top: '#778899', left: '#556677', right: '#667788' };

  const sizeW = def?.sizeW ?? 1;
  // Visual height scales with footprint
  const baseH = sizeW === 3 ? 16 : sizeW === 2 ? 12 : 8;

  // Block half-extents for this building footprint
  const blockW = (CELL_W * sizeW) / 2;
  const blockH = (CELL_H * sizeW) / 2;

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
