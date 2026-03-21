import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onStart: () => void;    // タップ時に呼ぶ（オーディオ初期化）
  complete: boolean;      // true になったらフェードアウト → onDone
  onDone: () => void;     // フェードアウト終了後にタイトルへ遷移
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onStart, complete, onDone }) => {
  const [phase, setPhase] = useState<'waiting' | 'loading' | 'fading'>('waiting');

  // complete フラグが立ったらフェードアウト開始
  useEffect(() => {
    if (complete && phase === 'loading') {
      setPhase('fading');
      const timer = setTimeout(onDone, 800); // フェードアウト時間
      return () => clearTimeout(timer);
    }
  }, [complete, phase, onDone]);

  const handleTap = () => {
    if (phase !== 'waiting') return;
    setPhase('loading');
    onStart();
  };

  return (
    <div
      className={`
        fixed inset-0 z-[200] flex flex-col items-center justify-center
        bg-white select-none cursor-pointer
        transition-opacity duration-700
        ${phase === 'fading' ? 'opacity-0' : 'opacity-100'}
      `}
      onClick={handleTap}
      onTouchStart={handleTap}
    >
      {/* ロゴ */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative">
          {/* グロー効果 */}
          <div className="absolute -inset-8 bg-purple-300/30 blur-3xl rounded-full animate-pulse" />
          <h1
            className="text-8xl font-black italic tracking-tighter text-transparent bg-clip-text relative"
            style={{ backgroundImage: 'linear-gradient(135deg, #06b6d4, #a855f7, #ec4899)' }}
          >
            NEON
          </h1>
        </div>
        <h2
          className="text-7xl font-black tracking-widest relative"
          style={{ color: '#1a1a2e', textShadow: '0 0 40px rgba(6,182,212,0.3)' }}
        >
          TETRIS<span className="text-purple-600">99</span>
        </h2>
      </div>

      {/* 状態テキスト */}
      <div className="absolute bottom-12 right-8 text-right">
        {phase === 'waiting' && (
          <p className="text-gray-400 text-sm tracking-widest animate-pulse">
            Tap anywhere to start
          </p>
        )}
        {(phase === 'loading' || phase === 'fading') && (
          <LoadingDots />
        )}
      </div>
    </div>
  );
};

// ドットアニメーション付き Loading...
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
      loading{dots}
    </p>
  );
};

export default SplashScreen;
