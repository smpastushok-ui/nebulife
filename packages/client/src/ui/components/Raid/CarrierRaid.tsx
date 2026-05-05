import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RaidEngine } from '../../../game/raid/index.js';
import type { RaidResult, RaidSnapshot } from '../../../game/raid/index.js';
import { ArenaLandscapeControls } from '../SpaceArena/ArenaLandscapeControls.js';
import { enterImmersive, exitImmersive } from '../../../services/immersive.js';

interface CarrierRaidProps {
  onExit: () => void;
  onAwardXP?: (amount: number, reason: string) => void;
}

const isMobileDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const COMBO_WINDOW_MS = 4200;

const emptySnapshot: RaidSnapshot = {
  phase: 'approach',
  elapsedSec: 0,
  playerHp: 130,
  playerMaxHp: 130,
  playerShield: 80,
  playerMaxShield: 80,
  alliedAlive: 5,
  enemiesActive: 0,
  kills: 0,
  modulesDestroyed: 0,
  modulesTotal: 7,
  reactorHp: 240,
  reactorMaxHp: 240,
  objective: 'raid.objective_waves',
};

export function CarrierRaid({ onExit, onAwardXP }: CarrierRaidProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<RaidEngine | null>(null);
  const onExitRef = useRef(onExit);
  const onAwardXPRef = useRef(onAwardXP);
  const awardedRef = useRef(false);
  const comboRef = useRef({ count: 0, lastAt: 0 });
  const [ready, setReady] = useState(false);
  const [snapshot, setSnapshot] = useState<RaidSnapshot>(emptySnapshot);
  const [result, setResult] = useState<RaidResult | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [killFx, setKillFx] = useState<{ id: number; combo: number; xp: number } | null>(null);
  const [mobile] = useState(isMobileDevice);
  const [isPortrait, setIsPortrait] = useState(() => mobile && window.innerHeight > window.innerWidth);

  useEffect(() => {
    onExitRef.current = onExit;
    onAwardXPRef.current = onAwardXP;
  }, [onExit, onAwardXP]);

  useEffect(() => {
    return () => {
      void exitImmersive();
    };
  }, []);

  const handleEnterFullscreen = useCallback(() => {
    void enterImmersive();
  }, []);

  useEffect(() => {
    window.history.pushState({ raid: true }, '');
    const onPopState = () => {
      setShowExitConfirm(true);
      window.history.pushState({ raid: true }, '');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!mobile) return;
    try { (screen.orientation as any).lock('landscape').catch(() => {}); } catch (_) {}
    const check = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
      try { (screen.orientation as any).unlock(); } catch (_) {}
    };
  }, [mobile]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    const shipId = localStorage.getItem('nebulife_hangar_ship') || 'blue';
    const customShipGlbUrl = shipId === 'custom'
      ? localStorage.getItem('nebulife_custom_ship_glb_url')
      : null;
    const engine = new RaidEngine(containerRef.current, {
      onExit: () => onExitRef.current(),
      onStatsUpdate: setSnapshot,
      onKill: () => {
        const now = performance.now();
        const nextCombo = now - comboRef.current.lastAt <= COMBO_WINDOW_MS
          ? comboRef.current.count + 1
          : 1;
        comboRef.current = { count: nextCombo, lastAt: now };
        const comboXp = nextCombo >= 3 ? Math.min(40, nextCombo * 3) : 0;
        if (comboXp > 0) onAwardXPRef.current?.(comboXp, 'carrier_raid_combo');
        const id = Date.now();
        setKillFx({ id, combo: nextCombo, xp: comboXp });
        window.setTimeout(() => {
          setKillFx(current => current?.id === id ? null : current);
        }, 1400);
      },
      onRaidEnd: (raidResult) => {
        setResult(raidResult);
        if (!awardedRef.current && raidResult.xp > 0) {
          awardedRef.current = true;
          onAwardXPRef.current?.(raidResult.xp, 'carrier_raid');
        }
      },
    }, shipId, customShipGlbUrl);
    engineRef.current = engine;
    engine.init()
      .then(() => {
        if (!cancelled && engineRef.current === engine) setReady(true);
      })
      .catch((error) => {
        if (cancelled || engineRef.current !== engine) return;
        console.error('[CarrierRaid] failed to initialize', error);
        setResult({
          victory: false,
          kills: 0,
          modulesDestroyed: 0,
          elapsedSec: 0,
          xp: 0,
          minerals: 0,
          isotopes: 0,
          techFragments: 0,
        });
      });
    return () => {
      cancelled = true;
      engine.destroy();
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, []);

  const handleMove = useCallback((x: number, y: number) => {
    engineRef.current?.setMobileMove(x, y);
  }, []);

  const handleAim = useCallback((x: number, y: number, firing: boolean) => {
    engineRef.current?.setMobileAim(x, y, firing);
  }, []);

  const handleDash = useCallback(() => {
    engineRef.current?.triggerDash();
  }, []);

  const handleFireMissile = useCallback(() => {
    engineRef.current?.fireMissile();
  }, []);

  const handleSector = useCallback((sector: 'center' | 'missile' | 'warp' | 'dodge' | 'gravity') => {
    engineRef.current?.setMobileSector(sector);
  }, []);

  const needRotate = mobile && isPortrait;
  const hpPct = Math.max(0, Math.min(1, snapshot.playerHp / Math.max(1, snapshot.playerMaxHp)));
  const shieldPct = Math.max(0, Math.min(1, snapshot.playerShield / Math.max(1, snapshot.playerMaxShield)));
  const reactorPct = Math.max(0, Math.min(1, snapshot.reactorHp / Math.max(1, snapshot.reactorMaxHp)));

  return (
    <div style={S.root}>
      <div
        style={{
          ...S.stage,
          transform: needRotate ? 'rotate(90deg)' : undefined,
          transformOrigin: needRotate ? 'center center' : undefined,
          width: needRotate ? '100vh' : '100vw',
          height: needRotate ? '100vw' : '100vh',
          left: needRotate ? 'calc((100vw - 100vh) / 2)' : 0,
          top: needRotate ? 'calc((100vh - 100vw) / 2)' : 0,
        }}
      >
        <div ref={containerRef} style={S.canvasHost} />
        {!ready && <div style={S.loading}>{t('raid.loading')}</div>}

        <div style={S.topHud}>
          <div style={S.titleBlock}>
            <div style={S.kicker}>{t('raid.kicker')}</div>
            <div style={S.title}>{t('raid.title')}</div>
          </div>
          <div style={S.objective}>
            <span>{t('raid.objective')}</span>
            <strong>{t(snapshot.objective)}</strong>
          </div>
          <div style={S.topActions}>
            <button style={S.exitBtn} onClick={handleEnterFullscreen}>{t('raid.fullscreen')}</button>
            <button style={S.exitBtn} onClick={() => setShowExitConfirm(true)}>{t('common.close')}</button>
          </div>
        </div>

        <div style={S.leftHud}>
          <Meter label={t('raid.hull')} value={snapshot.playerHp} max={snapshot.playerMaxHp} pct={hpPct} color="#cc4444" />
          <Meter label={t('raid.shield')} value={snapshot.playerShield} max={snapshot.playerMaxShield} pct={shieldPct} color="#4488aa" />
          <div style={S.statGrid}>
            <Stat label={t('raid.kills')} value={snapshot.kills} />
            <Stat label={t('raid.allies')} value={snapshot.alliedAlive} />
            <Stat label={t('raid.enemies')} value={snapshot.enemiesActive} />
            <Stat label={t('raid.modules')} value={`${snapshot.modulesDestroyed}/${snapshot.modulesTotal}`} />
          </div>
        </div>

        <div style={S.reactorHud}>
          <div style={S.reactorHeader}>
            <span>{t('raid.reactor')}</span>
            <strong>{Math.ceil(reactorPct * 100)}%</strong>
          </div>
          <div style={S.barOuter}><div style={{ ...S.barInner, width: `${reactorPct * 100}%`, background: '#ff8844' }} /></div>
        </div>

        {mobile && (
          <ArenaLandscapeControls
            onMove={handleMove}
            onAim={handleAim}
            onDash={handleDash}
            onFireMissile={handleFireMissile}
            onSector={handleSector}
            missileAmmo={10}
            warpReady
            needRotate={needRotate}
          />
        )}

        {!mobile && (
          <div style={S.help}>{t('raid.controls')}</div>
        )}

        {killFx && (
          <div key={killFx.id} style={S.killFx}>
            <div style={S.killText}>{t('raid.kill')}</div>
            <div style={S.comboText}>
              {killFx.combo >= 2 ? t('raid.combo', { count: killFx.combo }) : t('raid.keep_chain')}
              {killFx.xp > 0 ? <span style={S.comboXp}>+{killFx.xp} XP</span> : null}
            </div>
          </div>
        )}

        {showExitConfirm && !result && (
          <ConfirmDialog
            title={t('raid.exit_title')}
            body={t('raid.exit_body')}
            confirm={t('raid.exit_confirm')}
            cancel={t('common.cancel')}
            onConfirm={onExit}
            onCancel={() => setShowExitConfirm(false)}
          />
        )}

        {result && (
          <div style={S.resultOverlay}>
            <div style={S.resultCard}>
              <div style={{ ...S.resultTitle, color: result.victory ? '#44ff88' : '#ff8844' }}>
                {result.victory ? t('raid.victory') : t('raid.defeat')}
              </div>
              <div style={S.resultStats}>
                <Stat label={t('raid.kills')} value={result.kills} />
                <Stat label={t('raid.modules')} value={result.modulesDestroyed} />
                <Stat label="XP" value={result.xp} />
                <Stat label={t('raid.reward_minerals')} value={result.minerals} />
                <Stat label={t('raid.reward_isotopes')} value={result.isotopes} />
                <Stat label={t('raid.reward_fragments')} value={result.techFragments} />
              </div>
              <button style={S.resultButton} onClick={onExit}>{t('raid.return_hangar')}</button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes raidKillPop {
            0% { opacity: 0; transform: translate(-50%, 18px) scale(0.88); }
            16% { opacity: 1; transform: translate(-50%, 0) scale(1.06); }
            72% { opacity: 1; transform: translate(-50%, -8px) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -24px) scale(0.96); }
          }
        `}</style>
      </div>
    </div>
  );
}

function Meter({ label, value, max, pct, color }: { label: string; value: number; max: number; pct: number; color: string }) {
  return (
    <div style={S.meter}>
      <div style={S.meterHeader}>
        <span>{label}</span>
        <strong>{value}/{max}</strong>
      </div>
      <div style={S.barOuter}><div style={{ ...S.barInner, width: `${pct * 100}%`, background: color }} /></div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={S.stat}>
      <div style={S.statValue}>{value}</div>
      <div style={S.statLabel}>{label}</div>
    </div>
  );
}

function ConfirmDialog({ title, body, confirm, cancel, onConfirm, onCancel }: {
  title: string;
  body: string;
  confirm: string;
  cancel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={S.resultOverlay}>
      <div style={S.confirmCard}>
        <div style={S.resultTitle}>{title}</div>
        <div style={S.confirmBody}>{body}</div>
        <div style={S.confirmActions}>
          <button style={S.secondaryButton} onClick={onCancel}>{cancel}</button>
          <button style={S.resultButton} onClick={onConfirm}>{confirm}</button>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: {
    position: 'fixed',
    inset: 0,
    zIndex: 9900,
    background: '#020510',
    overflow: 'hidden',
    fontFamily: 'monospace',
  },
  stage: {
    position: 'absolute',
    overflow: 'hidden',
    background: '#020510',
  },
  canvasHost: {
    position: 'absolute',
    inset: 0,
  },
  loading: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    color: '#7bb8ff',
    background: 'rgba(2,5,16,0.72)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  topHud: {
    position: 'absolute',
    top: 'calc(12px + env(safe-area-inset-top, 0px))',
    left: 'calc(14px + env(safe-area-inset-left, 0px))',
    right: 'calc(14px + env(safe-area-inset-right, 0px))',
    display: 'grid',
    gridTemplateColumns: '1fr minmax(220px, 420px) auto',
    gap: 12,
    alignItems: 'start',
    pointerEvents: 'none',
  },
  titleBlock: {
    background: 'rgba(5,10,20,0.78)',
    border: '1px solid #334455',
    borderRadius: 4,
    padding: '10px 12px',
  },
  kicker: {
    color: '#667788',
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#aabbcc',
    fontSize: 16,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 3,
  },
  objective: {
    background: 'rgba(5,10,20,0.82)',
    border: '1px solid #446688',
    borderRadius: 4,
    padding: '10px 12px',
    textAlign: 'center',
    color: '#667788',
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  exitBtn: {
    pointerEvents: 'auto',
    background: 'rgba(10,15,25,0.86)',
    border: '1px solid #334455',
    borderRadius: 4,
    color: '#8899aa',
    fontFamily: 'monospace',
    padding: '10px 12px',
    cursor: 'pointer',
    textTransform: 'uppercase',
  },
  topActions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    pointerEvents: 'auto',
  },
  leftHud: {
    position: 'absolute',
    left: 'calc(14px + env(safe-area-inset-left, 0px))',
    bottom: 'calc(18px + env(safe-area-inset-bottom, 0px))',
    width: 250,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    pointerEvents: 'none',
  },
  meter: {
    background: 'rgba(5,10,20,0.78)',
    border: '1px solid #334455',
    borderRadius: 4,
    padding: 9,
  },
  meterHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#8899aa',
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  barOuter: {
    height: 8,
    border: '1px solid #223344',
    background: 'rgba(2,5,16,0.8)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  barInner: {
    height: '100%',
    transition: 'width 0.12s linear',
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 8,
  },
  stat: {
    background: 'rgba(5,10,20,0.78)',
    border: '1px solid #223344',
    borderRadius: 4,
    padding: '8px 6px',
    textAlign: 'center',
  },
  statValue: {
    color: '#aabbcc',
    fontSize: 15,
    letterSpacing: 1,
  },
  statLabel: {
    color: '#667788',
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  reactorHud: {
    position: 'absolute',
    right: 'calc(14px + env(safe-area-inset-right, 0px))',
    bottom: 'calc(18px + env(safe-area-inset-bottom, 0px))',
    width: 280,
    background: 'rgba(5,10,20,0.78)',
    border: '1px solid #553322',
    borderRadius: 4,
    padding: 10,
  },
  reactorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#ff8844',
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  help: {
    position: 'absolute',
    left: '50%',
    bottom: 18,
    transform: 'translateX(-50%)',
    color: '#667788',
    background: 'rgba(5,10,20,0.68)',
    border: '1px solid #223344',
    borderRadius: 4,
    padding: '8px 12px',
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  killFx: {
    position: 'absolute',
    left: '50%',
    bottom: 'calc(118px + env(safe-area-inset-bottom, 0px))',
    transform: 'translateX(-50%)',
    minWidth: 220,
    padding: '12px 22px',
    textAlign: 'center',
    background: 'rgba(5,10,20,0.84)',
    border: '1px solid #4488aa',
    borderRadius: 5,
    pointerEvents: 'none',
    animation: 'raidKillPop 1.4s ease-out forwards',
  },
  killText: {
    color: '#aabbcc',
    fontSize: 24,
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
  comboText: {
    marginTop: 4,
    color: '#7bb8ff',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  comboXp: {
    marginLeft: 10,
    color: '#44ff88',
  },
  resultOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(2,5,16,0.72)',
    pointerEvents: 'auto',
  },
  resultCard: {
    width: 'min(520px, calc(100vw - 32px))',
    background: 'rgba(10,15,25,0.96)',
    border: '1px solid #446688',
    borderRadius: 8,
    padding: 22,
  },
  confirmCard: {
    width: 'min(420px, calc(100vw - 32px))',
    background: 'rgba(10,15,25,0.96)',
    border: '1px solid #446688',
    borderRadius: 8,
    padding: 22,
  },
  resultTitle: {
    color: '#aabbcc',
    fontSize: 20,
    letterSpacing: 3,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 16,
  },
  resultStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 10,
    marginBottom: 18,
  },
  resultButton: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #4488aa',
    borderRadius: 4,
    background: 'rgba(68,136,170,0.18)',
    color: '#7bb8ff',
    fontFamily: 'monospace',
    letterSpacing: 2,
    textTransform: 'uppercase',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '12px 16px',
    border: '1px solid #334455',
    borderRadius: 4,
    background: 'rgba(10,15,25,0.82)',
    color: '#8899aa',
    fontFamily: 'monospace',
    letterSpacing: 2,
    textTransform: 'uppercase',
    cursor: 'pointer',
  },
  confirmBody: {
    color: '#8899aa',
    fontSize: 12,
    lineHeight: 1.5,
    textAlign: 'center',
    marginBottom: 18,
  },
  confirmActions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
};
