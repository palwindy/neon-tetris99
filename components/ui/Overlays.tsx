
import React from 'react';
import { Play, RotateCcw as ResetIcon, Home, Music, Zap, Trophy, Timer, Star } from 'lucide-react';
import { VictoryConfetti, PlayerAttackEffect } from '../effects/GameEffects';
import { audioService } from '../../services/audioService';
import { SingleRecord } from '../../services/recordsService';
import { formatTime } from '../../services/recordsService';
import { GameMode } from '../../types';

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
  // モード別
  gameMode: GameMode;
  cpuElapsed: number;
  cpuResult: { time: number; isNewRecord: boolean } | null;
  singleTop5: SingleRecord[];
  singleResult: { rank: number; isNewRecord: boolean } | null;
}

const RANK_COLORS = ['#fde047','#d1d5db','#cd7c2f','#a0aec0','#718096'];

const Overlays: React.FC<OverlaysProps> = ({
  playerAttack, gameOver, isWinner, paused, gameStarted, score,
  bgmOn, seOn, onBgmToggle, onSeToggle, onResume, onRetry, onQuitToTitle,
  gameMode, cpuElapsed, cpuResult, singleTop5, singleResult,
}) => {
  const handleResume = () => { audioService.playCancel(); onResume(); };
  const handleRetry  = () => { audioService.playOk(); onRetry(); };
  const handleQuit   = () => { audioService.playOk(); onQuitToTitle(); };

  return (
    <>
      {playerAttack && <PlayerAttackEffect key={playerAttack.id} damage={playerAttack.damage} />}

      {/* GAME OVER（SINGLE） */}
      {gameOver && gameMode === 'SINGLE' && (
        <div className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center z-20 backdrop-blur-sm rounded-lg px-3 gap-2">
          <h2 className="text-xl font-bold text-white">GAME OVER</h2>
          <div className="text-2xl font-mono text-white">{score.toLocaleString()}</div>

          {/* 自分の結果 */}
          {singleResult && singleResult.isNewRecord && (
            <div className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: '#fde047', color: '#7c2d12' }}>
              ★ TOP{singleResult.rank} 入り！
            </div>
          )}

          {/* TOP5 */}
          {singleTop5.length > 0 && (
            <div className="w-full max-w-[260px] bg-black/40 rounded-lg p-2 border border-red-700">
              <div className="text-[10px] text-red-300 font-bold mb-1 tracking-wider text-center">HIGH SCORES</div>
              {singleTop5.map((r, i) => (
                <div key={i} className="flex items-center gap-1 text-xs py-0.5 border-b border-red-900/40 last:border-0"
                  style={{ color: singleResult?.rank === i + 1 ? '#fde047' : '#e5e7eb' }}>
                  <span className="w-4 font-black text-center" style={{ color: RANK_COLORS[i] }}>#{i + 1}</span>
                  <span className="flex-1 font-mono">{r.score.toLocaleString()}</span>
                  <span className="text-[10px] opacity-60">Lv{r.level}</span>
                  <span className="text-[10px] opacity-60 w-12 text-right">{r.lines}L</span>
                  <span className="text-[10px] opacity-40 w-10 text-right">{r.date}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={handleRetry} className="bg-white text-red-900 font-bold py-2 px-6 rounded-full shadow-lg active:scale-95 mt-1">RETRY</button>
          <button onClick={handleQuit} className="text-white/70 hover:text-white text-sm">QUIT</button>
        </div>
      )}

      {/* GAME OVER（CPU / MULTI） */}
      {gameOver && gameMode !== 'SINGLE' && (
        <div className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center z-20 backdrop-blur-sm rounded-lg px-4">
          <h2 className="text-xl font-bold text-white mb-1">GAME OVER</h2>
          <div className="text-2xl font-mono text-white mb-4">{score.toLocaleString()}</div>
          <button onClick={handleRetry} className="bg-white text-red-900 font-bold py-2 px-6 rounded-full shadow-lg active:scale-95">RETRY</button>
          <button onClick={handleQuit} className="mt-4 text-white/70 hover:text-white text-sm">QUIT</button>
        </div>
      )}

      {/* WIN（CPU） */}
      {isWinner && gameMode === 'CPU' && (
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/90 to-orange-700/90 flex flex-col items-center justify-center z-20 backdrop-blur-md rounded-lg px-4 overflow-hidden gap-1">
          <VictoryConfetti />
          <Trophy size={60} className="text-yellow-300 animate-[bounce_1s_infinite]" />
          <h2 className="text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white to-yellow-200 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">YOU WIN!</h2>

          {/* クリアタイム */}
          <div className="flex items-center gap-2 bg-black/40 px-4 py-1.5 rounded-lg border border-white/20">
            <Timer size={16} className="text-yellow-200" />
            <span className="text-xl font-mono text-white font-bold">
              {cpuResult ? formatTime(cpuResult.time) : formatTime(cpuElapsed)}
            </span>
            {cpuResult?.isNewRecord && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded"
                style={{ background: '#fde047', color: '#7c2d12' }}>NEW REC</span>
            )}
          </div>

          <div className="text-sm font-mono text-white/80">Score: {score.toLocaleString()}</div>

          <button onClick={handleRetry} className="bg-white text-yellow-800 font-bold py-2 px-8 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.5)] active:scale-95 hover:scale-105 transition-transform z-20 mt-1">PLAY AGAIN</button>
          <button onClick={handleQuit} className="text-white/80 hover:text-white text-sm z-20 underline decoration-white/30">RETURN TO MENU</button>
        </div>
      )}

      {/* WIN（MULTI） */}
      {isWinner && gameMode !== 'CPU' && (
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/90 to-orange-700/90 flex flex-col items-center justify-center z-20 backdrop-blur-md rounded-lg px-4 overflow-hidden">
          <VictoryConfetti />
          <Trophy size={80} className="text-yellow-300 mb-4 animate-[bounce_1s_infinite]" />
          <h2 className="text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white to-yellow-200 mb-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">YOU WIN!</h2>
          <div className="text-xl font-mono text-white mb-8 bg-black/30 px-6 py-2 rounded-lg border border-white/20">Final Score: {score.toLocaleString()}</div>
          <button onClick={handleRetry} className="bg-white text-yellow-800 font-bold py-3 px-10 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.5)] active:scale-95 hover:scale-105 transition-transform z-20">PLAY AGAIN</button>
          <button onClick={handleQuit} className="mt-6 text-white/80 hover:text-white text-sm z-20 underline decoration-white/30">RETURN TO MENU</button>
        </div>
      )}

      {/* PAUSE */}
      {paused && gameStarted && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-20 gap-2 backdrop-blur-sm px-4 rounded-lg">
          <h2 className="text-xl font-black italic tracking-widest text-white mb-1 border-b-2 border-cyan-500 pb-1">PAUSED</h2>

          {/* VS CPU タイム表示（ポーズ中） */}
          {gameMode === 'CPU' && (
            <div className="flex items-center gap-1.5 text-xs text-cyan-300 mb-1">
              <Timer size={12} />
              <span className="font-mono">{formatTime(cpuElapsed)}</span>
            </div>
          )}

          <button onClick={handleResume} className="w-full max-w-[180px] py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.5)] active:scale-95 flex items-center justify-center gap-2 border border-cyan-400 text-sm">
            <Play size={16} fill="currentColor" /> RESUME
          </button>
          <button onClick={handleRetry} className="w-full max-w-[180px] py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg shadow-lg active:scale-95 flex items-center justify-center gap-2 border border-gray-600 text-sm">
            <ResetIcon size={16} /> RETRY
          </button>
          <button onClick={handleQuit} className="w-full max-w-[180px] py-2 bg-red-900/80 hover:bg-red-800 text-white font-bold rounded-lg shadow-lg active:scale-95 flex items-center justify-center gap-2 border border-red-700 text-sm">
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
                  <input type="checkbox" className="sr-only" checked={checked} onChange={e => {
                    audioService.playOk();
                    onChange(e.target.checked);
                  }} />
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
};

export default Overlays;
