import React from 'react';
import { Play, RotateCcw as ResetIcon, Home, Music, Zap, Trophy } from 'lucide-react';
import { VictoryConfetti, PlayerAttackEffect } from '../effects/GameEffects';

interface OverlaysProps {
  playerAttack: { id: string; damage: number } | null;
  gameOver: boolean;
  isWinner: boolean;
  paused: boolean;
  gameStarted: boolean;
  score: number;
  bgmOn: boolean;
  seOn: boolean;
  onBgmToggle: (on: boolean) => void;
  onSeToggle: (on: boolean) => void;
  onResume: () => void;
  onRetry: () => void;
  onQuitToTitle: () => void;
}

const Overlays: React.FC<OverlaysProps> = ({
  playerAttack, gameOver, isWinner, paused, gameStarted, score,
  bgmOn, seOn, onBgmToggle, onSeToggle, onResume, onRetry, onQuitToTitle,
}) => (
  <>
    {playerAttack && <PlayerAttackEffect key={playerAttack.id} damage={playerAttack.damage} />}

    {gameOver && (
      <div className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center z-20 backdrop-blur-sm rounded-lg px-4">
        <h2 className="text-xl font-bold text-white mb-1">GAME OVER</h2>
        <div className="text-2xl font-mono text-white mb-4 break-all text-center">{score}</div>
        <button onClick={onRetry} className="bg-white text-red-900 font-bold py-2 px-6 rounded-full shadow-lg active:scale-95">RETRY</button>
        <button onClick={onQuitToTitle} className="mt-4 text-white/70 hover:text-white text-sm">QUIT</button>
      </div>
    )}

    {isWinner && (
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/90 to-orange-700/90 flex flex-col items-center justify-center z-20 backdrop-blur-md rounded-lg px-4 overflow-hidden">
        <VictoryConfetti />
        <Trophy size={80} className="text-yellow-300 mb-4 animate-[bounce_1s_infinite]" />
        <h2 className="text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white to-yellow-200 mb-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">YOU WIN!</h2>
        <div className="text-xl font-mono text-white mb-8 bg-black/30 px-6 py-2 rounded-lg border border-white/20">Final Score: {score}</div>
        <button onClick={onRetry} className="bg-white text-yellow-800 font-bold py-3 px-10 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.5)] active:scale-95 hover:scale-105 transition-transform z-20">PLAY AGAIN</button>
        <button onClick={onQuitToTitle} className="mt-6 text-white/80 hover:text-white text-sm z-20 underline decoration-white/30">RETURN TO MENU</button>
      </div>
    )}

    {paused && gameStarted && (
      <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-20 gap-2 backdrop-blur-sm px-4 rounded-lg">
        <h2 className="text-xl font-black italic tracking-widest text-white mb-1 border-b-2 border-cyan-500 pb-1">PAUSED</h2>
        <button onClick={onResume} className="w-full max-w-[180px] py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.5)] active:scale-95 flex items-center justify-center gap-2 border border-cyan-400 text-sm">
          <Play size={16} fill="currentColor" /> RESUME
        </button>
        <button onClick={onRetry} className="w-full max-w-[180px] py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg shadow-lg active:scale-95 flex items-center justify-center gap-2 border border-gray-600 text-sm">
          <ResetIcon size={16} /> RETRY
        </button>
        <button onClick={onQuitToTitle} className="w-full max-w-[180px] py-2 bg-red-900/80 hover:bg-red-800 text-white font-bold rounded-lg shadow-lg active:scale-95 flex items-center justify-center gap-2 border border-red-700 text-sm">
          <Home size={16} /> TITLE
        </button>
        <div className="w-full max-w-[180px] mt-1 pt-3 border-t border-gray-700 flex flex-col gap-2">
          {[
            { label: 'BGM', icon: <Music size={13} className="text-cyan-400" />, checked: bgmOn, onChange: onBgmToggle },
            { label: 'SE',  icon: <Zap  size={13} className="text-yellow-400" />, checked: seOn,  onChange: onSeToggle },
          ].map(({ label, icon, checked, onChange }) => (
            <label key={label} className="flex items-center justify-between cursor-pointer select-none px-1">
              <span className="text-gray-400 text-xs flex items-center gap-1.5">{icon} {label}</span>
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
                <div className={`w-9 h-5 rounded-full transition-colors duration-200 ${checked ? 'bg-cyan-500' : 'bg-gray-700'}`} />
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </label>
          ))}
        </div>
      </div>
    )}
  </>
);

export default Overlays;
