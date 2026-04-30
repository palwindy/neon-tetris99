
import React from 'react';

export const VictoryConfetti = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
    {[...Array(50)].map((_, i) => (
      <div
        key={i}
        className="absolute -top-4 w-2 h-2 rounded-sm animate-fall"
        style={{
          left: `${Math.random() * 100}%`,
          backgroundColor: ['#f00','#0f0','#00f','#ff0','#0ff','#f0f'][Math.floor(Math.random() * 6)],
          animationDuration: `${2 + Math.random() * 3}s`,
          animationDelay: `${Math.random() * 2}s`,
        }}
      />
    ))}
    <style>{`
      @keyframes fall {
        0% { transform: translateY(-10%) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
      .animate-fall { animation-name: fall; animation-timing-function: linear; animation-iteration-count: infinite; }
    `}</style>
  </div>
);

/* ダメージ量 → 演出スタイル変換 */
function getAttackStyle(val: number): {
  color: string; glow: string; fontSize: string; label: string; particles: number;
} {
  if (val >= 4) return { color: '#ef4444', glow: '#ff2222', fontSize: '3.8rem', label: `${val}`, particles: 12 };
  if (val === 3) return { color: '#f97316', glow: '#ff8800', fontSize: '3.2rem', label: `${val}`, particles: 8 };
  if (val === 2) return { color: '#fde047', glow: '#ffee00', fontSize: '2.6rem', label: `${val}`, particles: 5 };
  return               { color: '#06b6d4', glow: '#00e5ff', fontSize: '2rem',   label: `${val}`, particles: 3 };
}

/* パーティクル1個 */
const Particle: React.FC<{ color: string; angle: number; dist: number; duration: number }> = ({ color, angle, dist, duration }) => {
  const rad = (angle * Math.PI) / 180;
  const tx = Math.cos(rad) * dist;
  const ty = Math.sin(rad) * dist;
  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%',
      width: 8, height: 8, borderRadius: '50%',
      background: color,
      boxShadow: `0 0 6px ${color}`,
      animation: `particle-fly-${Math.floor(angle)} ${duration}ms ease-out forwards`,
    }}>
      <style>{`
        @keyframes particle-fly-${Math.floor(angle)} {
          0%   { transform: translate(-50%, -50%) translate(0px, 0px) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(${tx}px, ${ty}px) scale(0); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

/**
 * PlayerAttackEffect
 * VS CPU: damage = CPU に与えたダメージ量
 * VS MULTI: damage = 送信したライン数
 * どちらも同じコンポーネントで表示。値が大きいほど派手。
 */
export const PlayerAttackEffect: React.FC<{ damage: number; mode?: 'cpu' | 'multi' }> = ({ damage, mode = 'cpu' }) => {
  const { color, glow, fontSize, label, particles } = getAttackStyle(damage);
  const duration = 900 + damage * 60;
  const beamIntensity = Math.min(damage, 4);

  // パーティクルの角度配列
  const angles = Array.from({ length: particles }, (_, i) => (360 / particles) * i + Math.random() * 15);

  const prefix = mode === 'multi' ? '+' : '-';
  const suffix = mode === 'multi' ? 'L' : '';

  return (
    <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden flex items-center justify-center">

      {/* ビーム（強さに比例） */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        height: `${2 + beamIntensity}px`,
        width: '120%',
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        boxShadow: `0 0 ${10 + beamIntensity * 6}px ${glow}`,
        transform: 'translate(-50%, -50%)',
        animation: `beam-fade ${duration * 0.7}ms ease-out forwards`,
      }} />

      {/* 画面フラッシュ（大ダメージ時） */}
      {damage >= 3 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at center, ${color}22 0%, transparent 70%)`,
          animation: `screen-flash ${duration * 0.5}ms ease-out forwards`,
        }} />
      )}

      {/* リングエフェクト（大ダメージ時） */}
      {damage >= 3 && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 60, height: 60,
          borderRadius: '50%',
          border: `3px solid ${color}`,
          boxShadow: `0 0 20px ${glow}`,
          transform: 'translate(-50%,-50%)',
          animation: `ring-expand ${duration * 0.8}ms ease-out forwards`,
        }} />
      )}

      {/* パーティクル群 */}
      {angles.map((angle, i) => (
        <Particle key={i} color={color} angle={angle} dist={50 + damage * 12} duration={duration} />
      ))}

      {/* メインダメージ数値 */}
      <div style={{
        position: 'absolute',
        top: '38%', right: '12%',
        fontSize,
        fontWeight: 900,
        fontStyle: 'italic',
        color,
        textShadow: `0 0 10px ${glow}, 0 0 30px ${glow}, 0 0 60px ${color}88`,
        letterSpacing: '-0.02em',
        lineHeight: 1,
        animation: `damage-pop ${duration}ms ease-out forwards`,
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}>
        {prefix}{label}{suffix}
      </div>

      <style>{`
        @keyframes beam-fade {
          0%   { opacity: 0; transform: translate(-50%,-50%) scaleX(0); }
          25%  { opacity: 1; transform: translate(-50%,-50%) scaleX(1); }
          100% { opacity: 0; transform: translate(-50%,-50%) scaleX(1.5); }
        }
        @keyframes screen-flash {
          0%   { opacity: 0; }
          20%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes ring-expand {
          0%   { transform: translate(-50%,-50%) scale(0.2); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(3.5); opacity: 0; }
        }
        @keyframes damage-pop {
          0%   { transform: translateY(0)   scale(0.3); opacity: 0; }
          30%  { transform: translateY(-14px) scale(1.3); opacity: 1; }
          65%  { transform: translateY(-28px) scale(1.1); opacity: 1; }
          100% { transform: translateY(-48px) scale(0.9); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
