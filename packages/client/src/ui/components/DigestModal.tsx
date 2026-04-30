import React, { useState } from 'react';

interface DigestModalProps {
  images: string[];
  weekDate: string;
  onClose: () => void;
}

export function DigestModal({ images, weekDate, onClose }: DigestModalProps) {
  const [page, setPage] = useState(0);

  if (images.length === 0) return null;

  const prev = () => setPage(p => (p > 0 ? p - 1 : images.length - 1));
  const next = () => setPage(p => (p < images.length - 1 ? p + 1 : 0));

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(2,5,16,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '18px 12px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 'min(100%, 400px)',
          maxHeight: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          margin: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', justifyContent: 'space-between' }}>
          <span style={{ color: '#44ffaa', fontSize: 11, letterSpacing: '0.1em' }}>
            NEBULIFE WEEKLY
          </span>
          <span style={{ color: '#556677', fontSize: 9 }}>{weekDate}</span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid #334455',
              borderRadius: 3,
              color: '#667788',
              fontFamily: 'monospace',
              fontSize: 12,
              padding: '2px 8px',
              cursor: 'pointer',
            }}
          >
            X
          </button>
        </div>

        {/* Image */}
        <div style={{ position: 'relative', width: '100%' }}>
          <img
            src={images[page]}
            alt={`Digest page ${page + 1}`}
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: 4,
              border: '1px solid #223344',
            }}
          />

          {/* Nav arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={prev}
                style={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(2,5,16,0.8)',
                  border: '1px solid #334455',
                  borderRadius: 3,
                  color: '#aabbcc',
                  fontFamily: 'monospace',
                  fontSize: 16,
                  padding: '8px 10px',
                  cursor: 'pointer',
                }}
              >
                {'<'}
              </button>
              <button
                onClick={next}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(2,5,16,0.8)',
                  border: '1px solid #334455',
                  borderRadius: 3,
                  color: '#aabbcc',
                  fontFamily: 'monospace',
                  fontSize: 16,
                  padding: '8px 10px',
                  cursor: 'pointer',
                }}
              >
                {'>'}
              </button>
            </>
          )}
        </div>

        {/* Dot indicators */}
        {images.length > 1 && (
          <div style={{ display: 'flex', gap: 6 }}>
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  border: 'none',
                  background: i === page ? '#44ffaa' : '#334455',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
