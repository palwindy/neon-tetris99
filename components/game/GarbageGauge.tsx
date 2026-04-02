import React from 'react';

interface GarbageGaugeProps {
  pendingGarbage: number;
  variant: 'portrait' | 'landscape';
}

export function GarbageGauge({ pendingGarbage, variant }: GarbageGaugeProps) {
  const isPortrait = variant === 'portrait';
  const glowSize  = isPortrait ? 10 : 15;

  return (
    <div
      className={`absolute -left-1 bottom-0 ${isPortrait ? 'w-1' : 'w-1.5'} bg-gray-900/60 rounded-full overflow-hidden border border-gray-800`}
      style={{ height: isPortrait ? 'calc(100% - 20px)' : '100%' }}
    >
      <div
        className="absolute bottom-0 w-full transition-all duration-300"
        style={{
          height: `${Math.min(100, (pendingGarbage / 20) * 100)}%`,
          background: pendingGarbage > 10
            ? 'linear-gradient(to top, #ff1744, #f44336)'
            : 'linear-gradient(to top, #ffea00, #ff9100)',
          boxShadow: pendingGarbage > 0
            ? `0 0 ${glowSize}px ${pendingGarbage > 10 ? '#ff1744' : '#ffea00'}`
            : 'none',
        }}
      />
    </div>
  );
}
