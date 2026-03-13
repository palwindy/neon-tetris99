import React from 'react';
import { TETROMINOS, COLOR_MAP } from '../../constants';

interface NextQueueItemProps {
  type: string | null;
  index: number;
}

export const NextQueueItem: React.FC<NextQueueItemProps> = ({ type, index }) => {
  if (!type) return null;
  const piece = TETROMINOS[type as any];
  const scale = index === 0 ? 1 : 0.8;
  const opacity = index === 0 ? 1 : 0.6;
  return (
    <div className="flex flex-col items-center mb-1" style={{ transform: `scale(${scale})`, opacity }}>
      <div className="w-12 h-10 flex items-center justify-center bg-gray-900/50 rounded border border-gray-800">
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${piece.shape[0].length}, 1fr)`, gap: '2px' }}>
          {piece.shape.map((row, y) => row.map((cell, x) => (
            cell
              ? <div key={`${x}-${y}`} className="w-2 h-2 rounded-[1px]" style={{ backgroundColor: COLOR_MAP[piece.color] }} />
              : <div key={`${x}-${y}`} className="w-2 h-2" />
          )))}
        </div>
      </div>
    </div>
  );
};

interface MiniPieceIconProps {
  type: string | null;
}

export const MiniPieceIcon: React.FC<MiniPieceIconProps> = ({ type }) => {
  if (!type) return <span className="font-bold text-[8px] text-gray-500">EMPTY</span>;
  const piece = TETROMINOS[type as any];
  const cols = piece.shape[0].length;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '1px' }}>
      {piece.shape.map((row, y) => row.map((cell, x) => (
        cell
          ? <div key={`${x}-${y}`} className="w-1.5 h-1.5 rounded-[0.5px]" style={{ backgroundColor: COLOR_MAP[piece.color] }} />
          : <div key={`${x}-${y}`} className="w-1.5 h-1.5" />
      )))}
    </div>
  );
};
