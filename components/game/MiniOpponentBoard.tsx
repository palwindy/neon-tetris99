import React from 'react';
import { MultiPlayer } from '../../types';

interface MiniOpponentBoardProps {
  opponent: MultiPlayer | undefined;
}

export const MiniOpponentBoard: React.FC<MiniOpponentBoardProps> = ({ opponent }) => {
  if (!opponent) return null;

  const matrix = opponent.matrix || '';
  const isDefeated = opponent.status === 'defeated';
  // 上から8ブロック分（配列最初の80文字）にブロックがあればピンチ状態とする
  const isDanger = !isDefeated && matrix.substring(0, 80).includes('1');

  return (
    <div className={`relative flex flex-col items-center bg-gray-900 border-2 ${isDanger ? 'border-red-500/80 animate-pulse' : 'border-gray-700'} p-0.5 rounded shadow-[0_0_10px_rgba(0,0,0,0.5)] overflow-hidden scale-90`}>
      
      {/* Name Label */}
      <div className="text-[6px] text-gray-400 text-center w-full truncate px-0.5 max-w-[34px] font-sans font-bold leading-none mb-0.5">
        {opponent.name}
      </div>

      {/* 10x20 Mini Grid */}
      <div 
        className="grid gap-[0.5px] opacity-90" 
        style={{ 
          gridTemplateColumns: 'repeat(10, 3px)', 
          gridTemplateRows: 'repeat(20, 3px)',
          backgroundColor: '#374151'
        }}
      >
        {Array.from({ length: 200 }).map((_, i) => {
          const filled = matrix[i] === '1';
          return (
            <div 
              key={i} 
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: filled ? '#22d3ee' : '#111827' // cyan-400 / gray-900
              }}
            />
          );
        })}
      </div>

      {/* Defeated Overlay */}
      {isDefeated && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 backdrop-blur-[1px]">
          <span className="text-red-500 font-black text-[10px] transform -rotate-12 border border-red-500 px-1 bg-black/80 shadow-[0_0_5px_rgba(239,68,68,0.8)] leading-none py-0.5">
            K.O.
          </span>
        </div>
      )}

      {/* Incoming Garbage Indicator */}
      {opponent.pendingGarbage > 0 && !isDefeated && (
        <div className="absolute -top-1 -right-1 z-20">
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-yellow-200 animate-ping absolute opacity-75" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-yellow-200 relative flex items-center justify-center shadow-[0_0_5px_rgba(250,204,21,0.8)]">
             <span className="text-[6px] font-bold text-black scale-75 leading-none">{opponent.pendingGarbage}</span>
          </div>
        </div>
      )}
    </div>
  );
};
