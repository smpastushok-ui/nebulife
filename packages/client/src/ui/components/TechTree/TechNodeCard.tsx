import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TechNode, TechNodeStatus } from '@nebulife/core';
import { playSfx } from '../../../audio/SfxPlayer.js';

// ---------------------------------------------------------------------------
// TechNodeCard — Individual technology node card with 3 states
// ---------------------------------------------------------------------------

interface TechNodeCardProps {
  node: TechNode;
  status: TechNodeStatus;
  playerLevel: number;
  prerequisiteName?: string;
  onResearch: () => void;
}

// ── Styles per status ────────────────────────────────────────────────────

const lockedBg = 'rgba(10,15,25,0.5)';
const lockedBorder = 'rgba(51,68,85,0.2)';

const availableBg = 'rgba(15,25,40,0.7)';
const availableBorder = '#446688';

const researchedBg = 'rgba(20,35,25,0.5)';
const researchedBorder = 'rgba(68,255,136,0.3)';

export function TechNodeCard({
  node,
  status,
  playerLevel,
  prerequisiteName,
  onResearch,
}: TechNodeCardProps) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);

  const isLocked = status === 'locked';
  const isAvailable = status === 'available';
  const isResearched = status === 'researched';

  const techName = t(`tech.${node.id}.name`);
  const techDesc = t(`tech.${node.id}.desc`);

  // Determine why it's locked
  const lockedReason = (() => {
    if (!isLocked) return null;
    if (playerLevel < node.levelRequired) return t('tech_tree.needs_level', { level: node.levelRequired });
    if (node.prerequisiteId && prerequisiteName) return t('tech_tree.needs_tech', { tech: prerequisiteName });
    return t('tech_tree.locked');
  })();

  const bg = isResearched ? researchedBg : isAvailable ? availableBg : lockedBg;
  const borderColor = isResearched
    ? researchedBorder
    : isAvailable
      ? availableBorder
      : lockedBorder;

  const nameColor = isResearched ? '#44ff88' : isAvailable ? '#aaccee' : '#445566';
  const textColor = isResearched ? '#88ccaa' : isAvailable ? '#aabbcc' : '#334455';
  const iconColor = isResearched ? '#44ff88' : isAvailable ? '#4488aa' : '#334455';
  const metaColor = isResearched ? '#668877' : isAvailable ? '#667788' : '#2a3344';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        maxWidth: 280,
        width: '100%',
        padding: '14px 16px',
        background: hovered && !isLocked ? 'rgba(20,30,45,0.8)' : bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 4,
        fontFamily: 'monospace',
        transition: 'background 0.15s, border-color 0.15s',
        animation: isAvailable ? 'tech-node-pulse 2.5s ease-in-out infinite' : undefined,
      }}
    >
      {/* Header: icon + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 18, color: iconColor, lineHeight: 1 }}>
          {isResearched ? '\u2713' : node.iconSymbol}
        </span>
        <span style={{ fontSize: 12, color: nameColor, fontWeight: 600 }}>
          {techName}
        </span>
      </div>

      {/* Description */}
      <div style={{ fontSize: 11, color: textColor, lineHeight: 1.6, marginBottom: 8 }}>
        {techDesc}
      </div>

      {/* Meta: level + XP */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 10,
          color: metaColor,
          marginBottom: isAvailable ? 10 : 0,
        }}
      >
        <span>{t('tech_tree.level_label')} {node.levelRequired}</span>
        <span style={{ color: isLocked ? '#1a2233' : '#334455' }}>|</span>
        <span>XP: +{node.xpReward}</span>
      </div>

      {/* Locked reason */}
      {isLocked && lockedReason && (
        <div style={{ fontSize: 10, color: '#334455', marginTop: 6 }}>
          {lockedReason}
        </div>
      )}

      {/* Research button (available only) */}
      {isAvailable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            playSfx('tech-unlock', 0.4);
            onResearch();
          }}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          style={{
            display: 'block',
            width: '100%',
            padding: '7px 0',
            background: btnHovered ? 'rgba(68,136,170,0.3)' : 'rgba(68,136,170,0.15)',
            border: `1px solid ${btnHovered ? 'rgba(68,136,170,0.6)' : 'rgba(68,136,170,0.35)'}`,
            borderRadius: 3,
            color: '#aaccee',
            fontFamily: 'monospace',
            fontSize: 11,
            cursor: 'pointer',
            transition: 'background 0.15s, border-color 0.15s',
          }}
        >
          {t('tech_tree.research_btn')}
        </button>
      )}
    </div>
  );
}
