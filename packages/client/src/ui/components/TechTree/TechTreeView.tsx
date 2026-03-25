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

interface TechTreeViewProps {
  branch: TechBranch;
  playerLevel: number;
  techState: TechTreeState;
  onResearch: (techId: string) => void;
}

export function TechTreeView({ branch, playerLevel, techState, onResearch }: TechTreeViewProps) {
  const { t } = useTranslation();

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
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        padding: '8px 4px',
        animation: 'tech-tree-fade-in 0.35s ease-out',
      }}
    >
      {sortedEpochs.map(([epoch, epochNodes]) => (
        <div key={epoch}>
          {/* Epoch header */}
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: 10,
              color: '#556677',
              textTransform: 'uppercase',
              letterSpacing: 1,
              paddingBottom: 8,
              marginBottom: 16,
              borderBottom: '1px solid rgba(51,68,85,0.3)',
            }}
          >
            {EPOCH_LABEL_KEYS[epoch] ? t(EPOCH_LABEL_KEYS[epoch]) : t('tech_tree.epoch_fallback', { epoch })}
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
                    ? '#446688'
                    : '#334455';

              return (
                <React.Fragment key={node.id}>
                  {/* Connector line (not before first node in epoch) */}
                  {idx > 0 && (
                    <div
                      style={{
                        width: 2,
                        height: 20,
                        background: connectorColor,
                        opacity: 0.6,
                        transition: 'background 0.3s',
                      }}
                    />
                  )}
                  {/* Cross-epoch connector (first node of epoch 2+ connects to previous epoch's last) */}
                  {idx === 0 && epoch > 1 && (
                    <div
                      style={{
                        width: 2,
                        height: 12,
                        background: connectorColor,
                        opacity: 0.4,
                        marginBottom: 4,
                        borderLeft: `2px dashed ${connectorColor}`,
                      }}
                    />
                  )}
                  <TechNodeCard
                    node={node}
                    status={status}
                    playerLevel={playerLevel}
                    prerequisiteName={prereqName}
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
