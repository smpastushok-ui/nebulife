import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TechBranch, TechTreeState } from '@nebulife/core';
import { getBranchNodes, getTechNodeStatus } from '@nebulife/core';
import { TechNodeCard } from './TechNodeCard';

// ---------------------------------------------------------------------------
// TechTreeView — Scrollable vertical tech tree with epoch sections
// ---------------------------------------------------------------------------

const STYLE_ID = 'nebulife-tech-tree-styles';

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes tech-node-pulse {
      0%, 100% { border-color: rgba(68,102,136,0.6); }
      50% { border-color: rgba(68,136,170,0.9); }
    }
    @keyframes tech-tree-fade-in {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

const EPOCH_LABEL_KEYS: Record<number, string> = {
  1: 'tech_tree.epoch_1',
  2: 'tech_tree.epoch_2',
  3: 'tech_tree.epoch_3',
};

const BRANCH_LABEL_KEYS: Record<TechBranch, string> = {
  astronomy: 'archive.sub_astronomy',
  physics: 'archive.sub_physics',
  chemistry: 'archive.sub_chemistry',
  biology: 'archive.sub_biology',
};

const BRANCH_VISUALS: Record<TechBranch, { accent: string; soft: string; dim: string }> = {
  astronomy: { accent: '#7bb8ff', soft: 'rgba(123,184,255,0.16)', dim: 'rgba(123,184,255,0.34)' },
  physics:   { accent: '#aa88ff', soft: 'rgba(170,136,255,0.15)', dim: 'rgba(170,136,255,0.34)' },
  chemistry: { accent: '#55d6c2', soft: 'rgba(85,214,194,0.14)', dim: 'rgba(85,214,194,0.32)' },
  biology:   { accent: '#66dd88', soft: 'rgba(102,221,136,0.13)', dim: 'rgba(102,221,136,0.32)' },
};

function BranchGlyph({ branch, color }: { branch: TechBranch; color: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.35,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style: { flexShrink: 0 },
  };

  if (branch === 'astronomy') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3.2" />
        <ellipse cx="12" cy="12" rx="8.5" ry="3.4" />
        <path d="M19 5.2 H21 M20 4.2 V6.2" opacity="0.72" />
      </svg>
    );
  }
  if (branch === 'physics') {
    return (
      <svg {...common}>
        <path d="M5 14 C8 8 16 8 19 14" />
        <path d="M5 10 C8 16 16 16 19 10" opacity="0.65" />
        <circle cx="12" cy="12" r="1.8" />
      </svg>
    );
  }
  if (branch === 'chemistry') {
    return (
      <svg {...common}>
        <path d="M9 4.5 H15" />
        <path d="M10.5 4.5 V9.5 L6.8 16.2 A2.2 2.2 0 0 0 8.7 19.5 H15.3 A2.2 2.2 0 0 0 17.2 16.2 L13.5 9.5 V4.5" />
        <path d="M8.2 15.3 H15.8" opacity="0.6" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 20 C12 13 16 9.5 20 8" />
      <path d="M12 20 C12 13 8 9.5 4 8" opacity="0.78" />
      <path d="M12 14 C14.7 14 16.8 12.5 18 10.2" />
      <path d="M12 14 C9.3 14 7.2 12.5 6 10.2" opacity="0.7" />
      <path d="M12 20 V6" opacity="0.55" />
    </svg>
  );
}

interface TechTreeViewProps {
  branch: TechBranch;
  playerLevel: number;
  techState: TechTreeState;
  onResearch: (techId: string) => void;
}

export function TechTreeView({ branch, playerLevel, techState, onResearch }: TechTreeViewProps) {
  const { t } = useTranslation();
  const branchVisual = BRANCH_VISUALS[branch];

  useEffect(() => {
    ensureStyles();
  }, []);

  const nodes = getBranchNodes(branch);
  if (nodes.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 300,
          fontFamily: 'monospace',
          fontSize: 12,
          color: '#445566',
          textAlign: 'center',
        }}
      >
        {t('tech_tree.not_available')}
      </div>
    );
  }

  // Build a lookup map for prerequisite names (using i18n tech names)
  const nameMap: Record<string, string> = {};
  for (const n of nodes) nameMap[n.id] = t(`tech.${n.id}.name`);

  // Group by epoch
  const epochs = new Map<number, typeof nodes>();
  for (const node of nodes) {
    const list = epochs.get(node.epoch) ?? [];
    list.push(node);
    epochs.set(node.epoch, list);
  }

  const sortedEpochs = [...epochs.entries()].sort((a, b) => a[0] - b[0]);

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        padding: '8px 4px 14px',
        animation: 'tech-tree-fade-in 0.35s ease-out',
      }}
    >
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 14px',
          border: `1px solid ${branchVisual.dim}`,
          borderRadius: 8,
          background: `radial-gradient(circle at 18% 20%, ${branchVisual.soft}, transparent 36%), linear-gradient(135deg, rgba(8,14,24,0.58), rgba(5,10,18,0.28))`,
          boxShadow: `inset 0 0 18px rgba(255,255,255,0.025), 0 0 20px ${branchVisual.soft}`,
          fontFamily: 'monospace',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.22,
            backgroundImage: `linear-gradient(90deg, transparent, ${branchVisual.accent}33, transparent)`,
            transform: 'translateX(-38%) skewX(-18deg)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${branchVisual.dim}`,
            background: `radial-gradient(circle at 50% 35%, ${branchVisual.soft}, rgba(5,10,18,0.34))`,
            boxShadow: `0 0 16px ${branchVisual.soft}`,
            zIndex: 1,
          }}
        >
          <BranchGlyph branch={branch} color={branchVisual.accent} />
        </div>
        <div style={{ zIndex: 1, minWidth: 0 }}>
          <div style={{ color: branchVisual.accent, fontSize: 12, fontWeight: 700, letterSpacing: 0.9, textTransform: 'uppercase' }}>
            {t(BRANCH_LABEL_KEYS[branch])}
          </div>
          <div style={{ marginTop: 3, color: '#667788', fontSize: 10, letterSpacing: 0.6 }}>
            {t('tech_tree.nodes_count', { count: nodes.length })}
          </div>
        </div>
      </div>

      {sortedEpochs.map(([epoch, epochNodes]) => (
        <div
          key={epoch}
          style={{
            position: 'relative',
            padding: '12px 10px 14px',
            borderRadius: 10,
            border: `1px solid ${branchVisual.accent}18`,
            background: `linear-gradient(180deg, ${branchVisual.soft}, rgba(5,10,18,0.12) 34%, transparent)`,
          }}
        >
          {/* Epoch header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'monospace',
              fontSize: 10,
              color: branchVisual.accent,
              textTransform: 'uppercase',
              letterSpacing: 1,
              paddingBottom: 8,
              marginBottom: 16,
              borderBottom: `1px solid ${branchVisual.accent}24`,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                border: `1px solid ${branchVisual.accent}`,
                boxShadow: `0 0 10px ${branchVisual.dim}`,
              }}
            />
            <span>{EPOCH_LABEL_KEYS[epoch] ? t(EPOCH_LABEL_KEYS[epoch]) : t('tech_tree.epoch_fallback', { epoch })}</span>
          </div>

          {/* Nodes chain */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0,
            }}
          >
            {epochNodes.map((node, idx) => {
              const status = getTechNodeStatus(node, playerLevel, techState);
              const prereqName = node.prerequisiteId
                ? nameMap[node.prerequisiteId]
                : undefined;

              // Determine connector color based on status of current node
              const connectorColor =
                status === 'researched'
                  ? '#44ff88'
                  : status === 'available'
                    ? branchVisual.accent
                    : `${branchVisual.accent}28`;

              return (
                <React.Fragment key={node.id}>
                  {/* Connector line (not before first node in epoch) */}
                  {idx > 0 && (
                    <div
                      style={{
                        position: 'relative',
                        width: 18,
                        height: 24,
                        display: 'flex',
                        justifyContent: 'center',
                        transition: 'opacity 0.3s',
                      }}
                    >
                      <div
                        style={{
                          width: 1,
                          height: '100%',
                          background: `linear-gradient(180deg, transparent, ${connectorColor}, transparent)`,
                          boxShadow: status !== 'locked' ? `0 0 9px ${connectorColor}` : undefined,
                          opacity: status === 'locked' ? 0.55 : 0.85,
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          border: `1px solid ${connectorColor}`,
                          background: 'rgba(5,10,18,0.88)',
                          transform: 'translate(-50%, -50%)',
                          boxShadow: status !== 'locked' ? `0 0 8px ${connectorColor}` : undefined,
                          opacity: status === 'locked' ? 0.45 : 0.9,
                        }}
                      />
                    </div>
                  )}
                  {/* Cross-epoch connector (first node of epoch 2+ connects to previous epoch's last) */}
                  {idx === 0 && epoch > 1 && (
                    <div
                      style={{
                        width: 1,
                        height: 14,
                        background: `linear-gradient(180deg, transparent, ${connectorColor})`,
                        opacity: 0.5,
                        marginBottom: 4,
                        borderLeft: `1px dashed ${connectorColor}`,
                      }}
                    />
                  )}
                  <TechNodeCard
                    node={node}
                    status={status}
                    playerLevel={playerLevel}
                    prerequisiteName={prereqName}
                    branchAccent={branchVisual.accent}
                    branchSoft={branchVisual.soft}
                    onResearch={() => onResearch(node.id)}
                  />
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ))}

      {/* Bottom spacer */}
      <div style={{ height: 16 }} />
    </div>
  );
}
