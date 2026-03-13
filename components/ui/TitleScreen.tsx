import React from 'react';
import { User, Bot, Users, Settings } from 'lucide-react';

const TitleLogo = () => (
  <div className="mb-8 relative flex flex-col items-center">
    <h1 className="text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)] transform -skew-x-12">NEON</h1>
    <h1 className="text-6xl font-black italic tracking-tighter text-white transform -skew-x-12 -mt-4 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]">99</h1>
    <div className="absolute -inset-4 bg-purple-500/10 blur-3xl rounded-full -z-10 animate-pulse" />
  </div>
);

interface TitleScreenProps {
  version: string;
  onStartSingle: () => void;
  onStartCpu: () => void;
  onStartMulti: () => void;
  onOpenSettings: () => void;
}

const TitleScreen: React.FC<TitleScreenProps> = ({ version, onStartSingle, onStartCpu, onStartMulti, onOpenSettings }) => (
  <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
    style={{ background: 'radial-gradient(ellipse at center, #1a0a2e 0%, #0a0a14 70%)' }}>
    <TitleLogo />
    <div className="flex flex-col gap-3 mb-6 w-full max-w-[260px] px-4">
      <button onClick={onStartSingle}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-3 rounded-full shadow-[0_0_20px_rgba(147,51,234,0.5)] active:scale-95 text-lg tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-2">
        <User size={20} /> SINGLE PLAY
      </button>
      <button onClick={onStartCpu}
        className="w-full bg-gray-800/80 border border-gray-600 text-gray-300 font-bold py-2 rounded-full shadow-lg active:scale-95 tracking-wide hover:bg-gray-700 transition-all hover:text-white hover:border-gray-500 flex items-center justify-center gap-2">
        <Bot size={18} /> VS CPU
      </button>
      <button onClick={onStartMulti}
        className="w-full bg-gray-800/80 border border-gray-600 text-gray-300 font-bold py-2 rounded-full shadow-lg active:scale-95 tracking-wide hover:bg-gray-700 transition-all hover:text-white hover:border-gray-500 flex items-center justify-center gap-2">
        <Users size={18} /> VS MULTI
      </button>
    </div>
    <div className="flex gap-3">
      <button onClick={onOpenSettings}
        className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs py-2 px-4 rounded-lg border border-gray-600 flex items-center justify-center gap-2 active:scale-95 transition-colors">
        <Settings size={14} /> CONFIG
      </button>
    </div>
    <p className="mt-6 text-[10px] text-gray-700 tracking-widest">v{version}</p>
  </div>
);

export default TitleScreen;
