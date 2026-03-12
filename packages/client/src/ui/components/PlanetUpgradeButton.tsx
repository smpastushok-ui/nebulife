import React from 'react';

// ---------------------------------------------------------------------------
// PlanetUpgradeButton — "Оживити в 3D" / "Переглянути 3D"
// ---------------------------------------------------------------------------

interface PlanetUpgradeButtonProps {
  has3DModel: boolean;
  modelStatus?: string;
  onUpgrade: () => void;
}

const PlanetUpgradeButton: React.FC<PlanetUpgradeButtonProps> = ({
  has3DModel,
  modelStatus,
  onUpgrade,
}) => {
  // Model is ready — offer to regenerate with new look
  if (has3DModel) {
    return (
      <button style={styles.upgradeButton} onClick={onUpgrade}>
        <span style={styles.icon3D}>3D</span>
        <div style={styles.upgradeText}>
          <span style={styles.upgradeTitle}>Змінити вигляд</span>
          <span style={styles.upgradePrice}>49 ⚛</span>
        </div>
      </button>
    );
  }

  // Model is generating — show progress state
  if (modelStatus === 'generating_photo' || modelStatus === 'generating_3d' || modelStatus === 'running') {
    return (
      <button style={styles.generatingButton} disabled>
        <span style={styles.spinnerSmall} />
        <span>
          {modelStatus === 'generating_photo' ? 'Сканування поверхні...' : 'Матеріалізація...'}
        </span>
      </button>
    );
  }

  // Payment pending
  if (modelStatus === 'pending' || modelStatus === 'awaiting_payment') {
    return (
      <button style={styles.pendingButton} disabled>
        <span>Очікування оплати...</span>
      </button>
    );
  }

  // Default — offer upgrade
  return (
    <button style={styles.upgradeButton} onClick={onUpgrade}>
      <span style={styles.sparkle}>✨</span>
      <div style={styles.upgradeText}>
        <span style={styles.upgradeTitle}>Оживити в 3D</span>
        <span style={styles.upgradePrice}>49 ⚛</span>
      </div>
    </button>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  upgradeButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid rgba(123, 184, 255, 0.3)',
    background: 'linear-gradient(135deg, rgba(68, 136, 255, 0.15), rgba(123, 184, 255, 0.08))',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left' as const,
  },
  sparkle: {
    fontSize: 24,
  },
  upgradeText: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: '0.3px',
  },
  upgradePrice: {
    fontSize: 12,
    color: 'rgba(123, 184, 255, 0.8)',
    marginTop: 2,
  },
  viewButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid rgba(100, 255, 150, 0.3)',
    background: 'linear-gradient(135deg, rgba(100, 255, 150, 0.15), rgba(100, 255, 150, 0.05))',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    transition: 'all 0.2s ease',
    textAlign: 'left' as const,
  },
  icon3D: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(100, 255, 150, 0.2)',
    fontSize: 12,
    fontWeight: 700,
    color: '#64ff96',
    letterSpacing: '0.5px',
  },
  generatingButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid rgba(255, 200, 50, 0.3)',
    background: 'rgba(255, 200, 50, 0.08)',
    color: 'rgba(255, 200, 50, 0.9)',
    fontSize: 13,
    cursor: 'default',
  },
  pendingButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    cursor: 'default',
  },
  spinnerSmall: {
    width: 16,
    height: 16,
    border: '2px solid rgba(255, 200, 50, 0.2)',
    borderTopColor: 'rgba(255, 200, 50, 0.9)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

export default PlanetUpgradeButton;
