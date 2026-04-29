import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onStart: () => void;
  complete: boolean;
  onDone: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onStart, complete, onDone }) => {
  const [phase, setPhase] = useState<'waiting' | 'loading' | 'fading'>('waiting');

  const handleInteraction = () => {
    if (phase !== 'waiting') return;
    onStart();
    setPhase('loading');
  };

  useEffect(() => {
    console.log(`[SplashScreen] Phase check: ${phase}, complete: ${complete}`);
    if (complete && phase === 'loading') {
      console.log('[SplashScreen] Moving to fading phase');
      setPhase('fading');
      const timer = setTimeout(() => {
        console.log('[SplashScreen] Calling onDone');
        onDone();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [complete, phase, onDone]);

  return (
    <div
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
      className={`
        fixed inset-0 z-[200] flex flex-col items-center justify-center
        bg-white select-none cursor-pointer
        transition-opacity duration-700
        ${phase === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}
      `}
    >
      {/* ロゴ — 横向き表示エリア（高さ≒端末幅）に収まるようコンパクトに */}
      <div className="flex flex-col items-center mb-4">
        <div className="relative scale-75 origin-center">
          <div className="absolute -inset-8 bg-purple-300/30 blur-3xl rounded-full animate-pulse" />
          <h1
            className="text-8xl font-black italic tracking-tighter text-transparent bg-clip-text relative"
            style={{ backgroundImage: 'linear-gradient(135deg, #06b6d4, #a855f7, #ec4899)' }}
          >
            NEON
          </h1>
        </div>
        <h2
          className="text-6xl font-black tracking-widest relative -mt-2"
          style={{ color: '#1a1a2e', textShadow: '0 0 40px rgba(6,182,212,0.3)' }}
        >
          TETRIS<span className="text-purple-600">99</span>
        </h2>
      </div>

      {/* 状態テキスト */}
      <div className="absolute bottom-6 w-full flex flex-col items-center">
        {phase === 'waiting' ? (
          <p className="text-gray-400 font-bold tracking-[0.4em] animate-pulse text-sm">
            -- TAP START --
          </p>
        ) : (
          <div className="flex flex-col items-end w-full max-w-sm pr-12">
            <LoadingDots />
          </div>
        )}
      </div>
    </div>
  );
};

const LoadingDots: React.FC = () => {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const id = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 400);
    return () => clearInterval(id);
  }, []);
  return (
    <p className="text-gray-400 text-sm tracking-widest font-mono">
      loading<span className="inline-block w-6 text-left">{dots}</span>
    </p>
  );
};

export default SplashScreen;
