import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Discovery, CatalogEntry, StarSystem } from '@nebulife/core';
import {
  RARITY_COLORS,
  RARITY_LABELS,
  getCatalogEntry,
  buildPrompt,
  generateScientificReport,
} from '@nebulife/core';
import {
  requestGeneration,
  checkTaskStatus,
  pollUntilComplete,
  downloadImage,
  getScreenAspectRatio,
} from '../../api/kling-api.js';
import { PixelReveal } from './PixelReveal.js';
import { ScientificReport } from './ScientificReport.js';
import { PhotoModal } from './PhotoModal.js';

// ---------------------------------------------------------------------------
// ObservatoryView — Full-screen observatory terminal that:
//  1. Submits Kling AI generation request
//  2. Shows "Awaiting signal..." while Kling processes
//  3. Once image ready: pixel-by-pixel reveal (5 min)
//  4. After reveal: scientific report + photo modal
// ---------------------------------------------------------------------------

type Phase = 'submitting' | 'awaiting' | 'revealing' | 'report' | 'photo' | 'error';


const REVEAL_DURATION_MS = 30_000; // 30 seconds

export function ObservatoryView({
  discovery,
  system,
  playerId,
  onClose,
  onSaveToGallery,
  cost = 0,
  adPhotoToken,
}: {
  discovery: Discovery;
  system: StarSystem;
  playerId: string;
  onClose: () => void;
  onSaveToGallery?: (discoveryId: string, imageUrl: string) => void;
  cost?: number;
  adPhotoToken?: string;
}) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('submitting');
  const [klingStatus, setKlingStatus] = useState<string>('pending');
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealProgress, setRevealProgress] = useState(0);
  const [skipReveal, setSkipReveal] = useState(false);
  const [reportText, setReportText] = useState<string>('');
  const mountedRef = useRef(true);

  const catalog = getCatalogEntry(discovery.type) as CatalogEntry | undefined;
  const color = RARITY_COLORS[discovery.rarity];
  const objectName = catalog?.nameUk ?? discovery.type;

  // Generate scientific report text
  useEffect(() => {
    const text = generateScientificReport(discovery, system, system.seed);
    setReportText(text);
  }, [discovery, system]);

  // Main pipeline: submit → poll → download → reveal
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    const run = async () => {
      try {
        // 1. Build prompt
        const prompt = buildPrompt(discovery.type, system, undefined, system.seed);
        const aspectRatio = getScreenAspectRatio();

        // 2. Submit generation request
        setPhase('submitting');
        const genRes = await requestGeneration({
          playerId,
          discoveryId: discovery.id,
          objectType: discovery.type,
          rarity: discovery.rarity,
          galleryCategory: discovery.galleryCategory,
          systemId: discovery.systemId,
          prompt,
          aspectRatio,
          scientificReport: reportText || undefined,
          cost,
          ...(adPhotoToken ? { adPhotoToken } : {}),
        });

        if (cancelled) return;

        // 3. Poll for completion
        setPhase('awaiting');
        const url = await pollUntilComplete(
          genRes.taskId,
          (status) => {
            if (!cancelled) setKlingStatus(status);
          },
          3000,
          120, // ~6 min max
        );

        if (cancelled) return;

        // 4. Download image
        setImageUrl(url);
        const blob = await downloadImage(url);
        if (cancelled) return;

        setImageBlob(blob);
        setPhase('revealing');
      } catch (err) {
        if (!cancelled) {
          console.error('Observatory pipeline error:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
          setPhase('error');
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [discovery, system, playerId, reportText, cost]);

  const handleRevealComplete = useCallback(() => {
    setPhase('report');
  }, []);

  const handleReportClose = useCallback(() => {
    setPhase('photo');
  }, []);

  const handleSaveToGallery = useCallback(() => {
    if (imageUrl) {
      onSaveToGallery?.(discovery.id, imageUrl);
    }
  }, [discovery.id, imageUrl, onSaveToGallery]);

  const handleSkipReveal = useCallback(() => {
    setSkipReveal(true);
    // Give PixelReveal one tick to finish, then advance
    setTimeout(() => setPhase('report'), 200);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9800,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'auto',
      }}
    >
      {/* ── Phase: Submitting / Awaiting ─────────────────────── */}
      {(phase === 'submitting' || phase === 'awaiting') && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'monospace',
            gap: 16,
          }}
        >
          {/* CRT scanline overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,20,10,0.08) 2px, rgba(0,20,10,0.08) 4px)',
              pointerEvents: 'none',
            }}
          />

          {/* Terminal header */}
          <div
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: 4,
              color: '#44ff88',
              opacity: 0.6,
            }}
          >
            {t('observatory.title')}
          </div>

          {/* Object info */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, color: '#ddeeff', fontWeight: 'bold', marginBottom: 6 }}>
              {objectName}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 3,
                  background: `${color}22`,
                  border: `1px solid ${color}55`,
                  color,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {RARITY_LABELS[discovery.rarity]}
              </span>
            </div>
          </div>

          {/* Status */}
          <div
            style={{
              fontSize: 14,
              color: '#44ff88',
              marginTop: 20,
              animation: 'pulse-text 1.5s ease-in-out infinite',
            }}
          >
            {phase === 'submitting'
              ? t('observatory.setting_up')
              : klingStatus === 'processing'
                ? t('observatory.processing_signal')
                : t('observatory.awaiting_signal')}
          </div>

          {/* Animated dots */}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#44ff88',
                  animation: `dot-pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>

          {/* Close button — below ResourceDisplay (top-right, z-index 9700) */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 56,
              right: 16,
              background: 'none',
              border: '1px solid #334455',
              color: '#556677',
              padding: '6px 12px',
              fontSize: 11,
              fontFamily: 'monospace',
              borderRadius: 3,
              cursor: 'pointer',
            }}
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {/* ── Phase: Revealing ──────────────────────────────── */}
      {phase === 'revealing' && imageBlob && (
        <div style={{ flex: 1, position: 'relative' }}>
          <PixelReveal
            imageBlob={imageBlob}
            duration={REVEAL_DURATION_MS}
            seed={system.seed}
            skip={skipReveal}
            onProgress={setRevealProgress}
            onComplete={handleRevealComplete}
          />

          {/* Top bar with object info */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              padding: '12px 16px',
              background: 'linear-gradient(rgba(0,0,0,0.7) 0%, transparent 100%)',
              fontFamily: 'monospace',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: '#44ff88', marginBottom: 2 }}>
                {t('observatory.signal_received')}
              </div>
              <div style={{ fontSize: 10, color: '#556677' }}>
                {objectName} &middot; {(revealProgress * 100).toFixed(0)}%
              </div>
            </div>
            <button
              onClick={handleSkipReveal}
              style={{
                background: 'rgba(20, 30, 40, 0.7)',
                border: '1px solid #445566',
                color: '#8899aa',
                padding: '6px 14px',
                fontSize: 11,
                fontFamily: 'monospace',
                borderRadius: 3,
                cursor: 'pointer',
              }}
            >
              {t('common.skip')} &raquo;
            </button>
          </div>
        </div>
      )}

      {/* ── Phase: Report ─────────────────────────────────── */}
      {phase === 'report' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          {/* Show revealed image as background */}
          {imageUrl && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(8px) brightness(0.3)',
              }}
            />
          )}
          <div style={{ position: 'relative', width: '100%', maxWidth: 500 }}>
            <ScientificReport
              reportText={reportText}
              objectName={objectName}
              rarity={discovery.rarity}
              onClose={handleReportClose}
            />
          </div>
        </div>
      )}

      {/* ── Phase: Photo Modal ────────────────────────────── */}
      {phase === 'photo' && imageUrl && (
        <PhotoModal
          discovery={discovery}
          imageUrl={imageUrl}
          systemName={system.name}
          onSaveToGallery={handleSaveToGallery}
          onClose={onClose}
        />
      )}

      {/* ── Phase: Error ──────────────────────────────────── */}
      {phase === 'error' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'monospace',
            gap: 16,
          }}
        >
          <div style={{ fontSize: 14, color: '#ff4444' }}>
            {t('observatory.error')}
          </div>
          <div style={{ fontSize: 12, color: '#885544', maxWidth: 400, textAlign: 'center' }}>
            {error}
          </div>
          <button
            onClick={onClose}
            style={{
              marginTop: 12,
              padding: '10px 24px',
              background: 'rgba(60, 30, 20, 0.5)',
              border: '1px solid #884433',
              color: '#cc6644',
              fontSize: 12,
              fontFamily: 'monospace',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {t('common.close')}
          </button>
        </div>
      )}

      {/* Global animation styles */}
      <style>{`
        @keyframes pulse-text {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes dot-pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
