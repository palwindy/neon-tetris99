import React, { useState } from 'react';
import { User, Bot, Users, Settings } from 'lucide-react';
import { audioService } from '../../services/audioService';

const TitleLogo = () => (
  <div className="mb-8 relative flex flex-col items-center">
    <h1 className="text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 transform -skew-x-12 leading-none">NEON</h1>
    <h1 className="text-4xl font-black italic tracking-tighter text-white transform -skew-x-12 -mt-1 leading-none">TETRIS</h1>
    <h1 className="text-8xl font-black italic tracking-tighter text-white transform -skew-x-12 -mt-4 drop-shadow-[0_0_20px_rgba(6,182,212,1)] leading-none">99</h1>
    <div className="absolute -inset-8 bg-purple-500/5 blur-3xl rounded-full -z-10 animate-pulse" />
  </div>
);

interface TitleScreenProps {
  version: string;
  onStartSingle: () => void;
  onStartCpu: () => void;
  onStartMulti: () => void;
  onOpenSettings: () => void;
}

const TitleScreen: React.FC<TitleScreenProps> = ({ version, onStartSingle, onStartCpu, onStartMulti, onOpenSettings }) => {
  const [selecting, setSelecting] = useState<string | null>(null);

  const handleSelect = (mode: string, action: () => void) => {
    if (selecting) return;
    setSelecting(mode);
    audioService.playOk();
    setTimeout(() => {
      action();
      // setTimeout 内で遷移するので、戻ってきた時のために cleanup は必要だが一瞬で消える
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center animate-fadeIn"
      style={{ background: 'radial-gradient(ellipse at center, #1a0a2e 0%, #0a0a14 70%)' }}>
      
      <TitleLogo />

      <div className="flex flex-col gap-3 mb-6 w-full max-w-[260px] px-4">
        <button onClick={() => handleSelect('single', onStartSingle)}
          disabled={selecting !== null}
          className={`w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-3 rounded-full shadow-[0_0_20px_rgba(147,51,234,0.5)] active:scale-95 text-lg tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-2 ${selecting === 'single' ? 'animate-blink' : ''}`}>
          <User size={20} /> SINGLE PLAY
        </button>
        <button onClick={() => handleSelect('cpu', onStartCpu)}
          disabled={selecting !== null}
          className={`w-full bg-gray-800/80 border border-gray-600 text-gray-300 font-bold py-2 rounded-full shadow-lg active:scale-95 tracking-wide hover:bg-gray-700 transition-all hover:text-white hover:border-gray-500 flex items-center justify-center gap-2 ${selecting === 'cpu' ? 'animate-blink' : ''}`}>
          <Bot size={18} /> VS CPU
        </button>
        <button onClick={() => handleSelect('multi', onStartMulti)}
          disabled={selecting !== null}
          className={`w-full bg-gray-800/80 border border-gray-600 text-gray-300 font-bold py-2 rounded-full shadow-lg active:scale-95 tracking-wide hover:bg-gray-700 transition-all hover:text-white hover:border-gray-500 flex items-center justify-center gap-2 ${selecting === 'multi' ? 'animate-blink' : ''}`}>
          <Users size={18} /> VS MULTI
        </button>
      </div>
      <div className="flex gap-3">
        <button onClick={onOpenSettings}
          disabled={selecting !== null}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs py-2 px-4 rounded-lg border border-gray-600 flex items-center justify-center gap-2 active:scale-95 transition-colors">
          <Settings size={14} /> CONFIG
        </button>
      </div>
      
      <p className="mt-6 text-[10px] text-gray-700 tracking-widest">v{version}</p>
    </div>
  );
};

export default TitleScreen;
