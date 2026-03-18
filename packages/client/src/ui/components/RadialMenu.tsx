import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { StarSystem } from '@nebulife/core';
import type { SystemPhotoData, SystemMissionData } from './SystemContextMenu.js';

// ---------------------------------------------------------------------------
// RadialMenu — circular action buttons around an expanded star in galaxy view
// ---------------------------------------------------------------------------

const ARC_RADIUS = 74;   // px from star center to button center
const BTN_SIZE   = 42;   // button diameter
const ARC_STEP   = 34;   // degrees between buttons
const STAGGER_MS = 55;   // stagger delay between button reveals

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ButtonDef {
  icon: string;
  tip: string;
  color: string;
  action: string;
  dim?: boolean;
  isPremium?: boolean;
}

interface ArcPos {
  left: number;
  top: number;
  cosA: number;
}

// ---------------------------------------------------------------------------
// Arc math
// ---------------------------------------------------------------------------

function arcPositions(count: number, cx: number, cy: number): ArcPos[] {
  const halfArc = (count - 1) * ARC_STEP / 2;
  const startDeg = -90 - halfArc;
  return Array.from({ length: count }, (_, i) => {
    const rad = (startDeg + i * ARC_STEP) * Math.PI / 180;
    return {
      left: cx + Math.cos(rad) * ARC_RADIUS - BTN_SIZE / 2,
      top:  cy + Math.sin(rad) * ARC_RADIUS - BTN_SIZE / 2,
      cosA: Math.cos(rad),
    };
  });
}

// ---------------------------------------------------------------------------
// Button builder (mirrors SystemContextMenu items exactly)
// ---------------------------------------------------------------------------

function buildButtons(props: {
  isHome: boolean;
  isResearched: boolean;
  systemPhoto: SystemPhotoData | null;
  activeMission: SystemMissionData | null;
  quarks: number;
  playerLevel: number;
}): ButtonDef[] {
  const { isHome, isResearched, systemPhoto, quarks } = props;
  const canEnter = isHome || isResearched;
  const hasPhoto = systemPhoto?.status === 'succeed' && !!systemPhoto.photoUrl;
  const photoGenerating = systemPhoto?.status === 'generating';

  const list: ButtonDef[] = [];

  // Navigation
  if (canEnter) {
    list.push({ icon: '\u2192', tip: 'До системи',      color: '#88ccaa', action: 'enter'   });
    list.push({ icon: '\u25CB', tip: "Об'єкти системи",  color: '#7799bb', action: 'objects' });
  }

  // General
  list.push({ icon: '\u2261', tip: 'Характеристики', color: '#8899aa', action: 'chars'  });
  list.push({ icon: '\u270E', tip: 'Перейменувати',  color: '#8899aa', action: 'rename' });

  // Research
  if (!isResearched && !isHome) {
    list.push({ icon: '\u25CE', tip: 'Дослідити',     color: '#4488aa', action: 'research' });
  }

  // Premium button — consolidates all paid tools (panorama active; missions in PremiumStubs.ts)
  if (isResearched) {
    let premAction = 'none';
    let premTip = `Панорама \u00B7 30\u269B`;
    let premDim = false;

    if (hasPhoto) {
      premAction = 'viewPhoto';
      premTip = 'Дивитися панораму';
    } else if (photoGenerating) {
      premAction = 'none';
      premTip = 'Обробка...';
      premDim = true;
    } else {
      premAction = quarks >= 30 ? 'telescope' : 'none';
      premDim = quarks < 30;
    }

    list.push({
      icon: '\u269B',   // ⚛
      tip: premTip,
      color: '#7bb8ff', // blue quark symbol
      action: premAction,
      dim: premDim,
      isPremium: true,
    });
  }

  return list;
}

// ---------------------------------------------------------------------------
// Spectral type labels
// ---------------------------------------------------------------------------

const SP_NAMES: Record<string, string> = {
  O: 'O-тип', B: 'B-тип', A: 'A-тип', F: 'F-тип',
  G: 'G-тип', K: 'K-тип', M: 'M-тип',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface RadialMenuProps {
  system: StarSystem;
  getScreenPos: () => { x: number; y: number } | null;
  isHome: boolean;
  isResearched: boolean;
  systemPhoto: SystemPhotoData | null;
  activeMission: SystemMissionData | null;
  quarks: number;
  playerLevel: number;
  onClose: () => void;
  onEnterSystem: () => void;
  onObjectsList: () => void;
  onRename: () => void;
  onCharacteristics: () => void;
  onResearch: () => void;
  onTelescopePhoto: () => void;
  onViewPhoto: () => void;
  onSendMission: (dur: 'short' | 'long') => void;
  onViewVideo: () => void;
}

export function RadialMenu({
  system, getScreenPos,
  isHome, isResearched, systemPhoto, activeMission, quarks, playerLevel,
  onClose, onEnterSystem, onObjectsList, onRename, onCharacteristics,
  onResearch, onTelescopePhoto, onViewPhoto, onSendMission, onViewVideo,
}: RadialMenuProps) {

  const containerRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rafRef = useRef<number>(0);
  const [revealed, setRevealed] = useState<boolean[]>([]);

  // Build button definitions
  const buttons = useMemo(
    () => buildButtons({ isHome, isResearched, systemPhoto, activeMission, quarks, playerLevel }),
    [isHome, isResearched, systemPhoto, activeMission, quarks, playerLevel],
  );

  // Action dispatch
  const handleAction = useCallback((action: string) => {
    switch (action) {
      case 'enter':        onEnterSystem(); break;
      case 'objects':      onObjectsList(); break;
      case 'chars':        onCharacteristics(); break;
      case 'rename':       onRename(); break;
      case 'research':     onResearch(); break;
      case 'telescope':    onTelescopePhoto(); break;
      case 'viewPhoto':    onViewPhoto(); break;
      case 'missionShort': onSendMission('short'); break;
      case 'missionLong':  onSendMission('long'); break;
      case 'viewVideo':    onViewVideo(); break;
      default: break;
    }
  }, [onEnterSystem, onObjectsList, onCharacteristics, onRename, onResearch,
      onTelescopePhoto, onViewPhoto, onSendMission, onViewVideo]);

  // Staggered reveal
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const arr = new Array(buttons.length).fill(false);
    setRevealed([...arr]);
    buttons.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setRevealed((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, i * STAGGER_MS + 10));
    });
    return () => timers.forEach(clearTimeout);
  }, [buttons.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Position tracking via rAF
  useEffect(() => {
    const loop = () => {
      const pos = getScreenPos();
      if (pos && containerRef.current) {
        const N = btnRefs.current.length;
        if (N > 0) {
          const positions = arcPositions(N, pos.x, pos.y);
          btnRefs.current.forEach((btn, i) => {
            if (btn && positions[i]) {
              btn.style.left = positions[i].left + 'px';
              btn.style.top  = positions[i].top + 'px';
            }
          });
        }
        if (chipRef.current) {
          chipRef.current.style.left = pos.x + 'px';
          chipRef.current.style.top  = (pos.y - ARC_RADIUS - 36) + 'px';
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [getScreenPos]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Planet count label
  const planetsCount = system.planets.length;
  const planetWord = planetsCount === 1 ? 'планета' : planetsCount < 5 ? 'планети' : 'планет';
  const spLabel = SP_NAMES[system.star.spectralClass] ?? system.star.spectralClass;

  // Initial positions (will be overwritten by rAF, but avoids flash)
  const initPos = getScreenPos();
  const initPositions = initPos ? arcPositions(buttons.length, initPos.x, initPos.y) : null;

  return (
    <>
      {/* Invisible backdrop to catch clicks outside */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 24, pointerEvents: 'auto',
        }}
        onClick={onClose}
      />

      {/* Info chip above star */}
      <div
        ref={chipRef}
        style={{
          position: 'fixed',
          textAlign: 'center',
          pointerEvents: 'none',
          zIndex: 25,
          fontFamily: 'monospace',
          transform: 'translateX(-50%)',
          opacity: revealed.some(Boolean) ? 1 : 0,
          transition: 'opacity 0.25s',
          left: initPos?.x ?? -9999,
          top: initPos ? initPos.y - ARC_RADIUS - 36 : -9999,
        }}
      >
        <div style={{ fontSize: 11, color: '#aabbcc', letterSpacing: '0.06em' }}>
          {system.name}
          {isHome && (
            <span style={{ color: '#44ff88', marginLeft: 8, fontSize: 10 }}>HOME</span>
          )}
        </div>
        <div style={{ fontSize: 8, color: '#445566', marginTop: 3, letterSpacing: '0.1em' }}>
          {isHome || isResearched
            ? `${spLabel} \u00B7 ${planetsCount} ${planetWord}`
            : `? \u00B7 ? планет`
          }
        </div>
      </div>

      {/* Radial buttons container */}
      <div ref={containerRef} style={{ position: 'fixed', top: 0, left: 0, width: 0, height: 0, zIndex: 25 }}>
        {buttons.map((def, i) => {
          const isLeft = initPositions ? initPositions[i].cosA < -0.15 : false;
          const isOpen = revealed[i] ?? false;

          return (
            <button
              key={`${def.action}-${i}`}
              ref={(el) => { btnRefs.current[i] = el; }}
              onClick={(e) => {
                e.stopPropagation();
                if (!def.dim) handleAction(def.action);
              }}
              style={{
                position: 'fixed',
                width: BTN_SIZE,
                height: BTN_SIZE,
                borderRadius: '50%',
                background: def.isPremium
                  ? (def.dim ? 'rgba(20,14,4,0.95)' : 'rgba(42,28,6,0.97)')
                  : 'rgba(8,16,28,0.95)',
                border: def.isPremium
                  ? `1px solid ${def.dim ? '#4a3810' : '#ddaa44'}`
                  : '1px solid #1a2d42',
                boxShadow: def.isPremium && !def.dim
                  ? '0 0 10px rgba(221,170,68,0.25), inset 0 0 8px rgba(221,170,68,0.08)'
                  : 'none',
                color: def.color,
                fontFamily: 'monospace',
                fontSize: 17,
                cursor: def.dim ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                zIndex: 25,
                pointerEvents: isOpen ? 'auto' : 'none',
                opacity: isOpen ? 1 : 0,
                transform: isOpen ? 'scale(1)' : 'scale(0)',
                transition: `opacity 0.15s, transform 0.22s cubic-bezier(.34,1.56,.64,1)`,
                left: initPositions?.[i]?.left ?? -9999,
                top: initPositions?.[i]?.top ?? -9999,
              }}
              data-premium={def.isPremium ? '1' : undefined}
              onMouseEnter={(e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                const isPrem = btn.dataset.premium === '1';
                if (!def.dim) {
                  btn.style.background = isPrem ? 'rgba(80,52,10,0.85)' : 'rgba(30,55,85,0.72)';
                  btn.style.color = isPrem ? '#ffe0a0' : '#ccddef';
                  btn.style.boxShadow = isPrem
                    ? '0 0 18px rgba(221,170,68,0.55)'
                    : '0 0 12px rgba(68,136,170,0.45)';
                  btn.style.zIndex = '50';
                }
                const tip = btn.querySelector('[data-tip]') as HTMLElement | null;
                if (tip) tip.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                const isPrem = btn.dataset.premium === '1';
                btn.style.background = isPrem
                  ? (def.dim ? 'rgba(20,14,4,0.95)' : 'rgba(42,28,6,0.97)')
                  : 'rgba(8,16,28,0.95)';
                btn.style.color = def.color;
                btn.style.boxShadow = isPrem && !def.dim
                  ? '0 0 10px rgba(221,170,68,0.25), inset 0 0 8px rgba(221,170,68,0.08)'
                  : 'none';
                btn.style.zIndex = '25';
                const tip = btn.querySelector('[data-tip]') as HTMLElement | null;
                if (tip) tip.style.opacity = '0';
              }}
            >
              {def.icon}
              {/* Tooltip */}
              <div
                data-tip="1"
                style={{
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  ...(isLeft
                    ? { right: 'calc(100% + 9px)', left: 'auto' }
                    : { left: 'calc(100% + 9px)', right: 'auto' }
                  ),
                  background: 'rgba(6,11,22,0.97)',
                  border: '1px solid #1a2d42',
                  padding: '3px 9px',
                  borderRadius: 3,
                  fontSize: 9,
                  color: '#8899aa',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  opacity: 0,
                  transition: 'opacity 0.1s',
                  letterSpacing: '0.06em',
                  zIndex: 10,
                }}
              >
                {def.tip}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
