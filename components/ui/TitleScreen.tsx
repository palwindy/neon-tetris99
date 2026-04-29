import React, { useState } from 'react';
import { User, Bot, Users, Settings } from 'lucide-react';
import { audioService } from '../../services/audioService';

const TitleLogo = () => (
  <div className="mb-3 relative flex flex-col items-center scale-75 origin-top">
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
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center animate-fadeIn"
      style={{ background: 'radial-gradient(ellipse at center, #1a0a2e 0%, #0a0a14 70%)' }}>
      
      <TitleLogo />

      <div className="flex flex-row gap-3 mb-4 w-full max-w-[700px] px-4 justify-center">
        <button onClick={() => handleSelect('single', onStartSingle)}
          disabled={selecting !== null}
          className={`flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-2 rounded-full shadow-[0_0_20px_rgba(147,51,234,0.5)] active:scale-95 text-base tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-2 ${selecting === 'single' ? 'animate-blink' : ''}`}>
          <User size={18} /> SINGLE
        </button>
        <button onClick={() => handleSelect('cpu', onStartCpu)}
          disabled={selecting !== null}
          className={`flex-1 bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-bold py-2 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.5)] active:scale-95 text-base tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-2 ${selecting === 'cpu' ? 'animate-blink' : ''}`}>
          <Bot size={18} /> VS CPU
        </button>
        <button onClick={() => handleSelect('multi', onStartMulti)}
          disabled={selecting !== null}
          className={`flex-1 bg-gradient-to-r from-orange-500 to-pink-600 text-white font-bold py-2 rounded-full shadow-[0_0_20px_rgba(249,115,22,0.5)] active:scale-95 text-base tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-2 ${selecting === 'multi' ? 'animate-blink' : ''}`}>
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
      
      <p className="mt-4 text-[10px] text-gray-700 tracking-widest">v{version}</p>
    </div>
  );
};

export default TitleScreen;
