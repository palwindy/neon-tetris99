import React, { useMemo } from 'react';
import { Grid, Position, TetrominoType } from '../types';
import { COLOR_MAP, TETROMINOS } from '../constants';

interface BoardProps {
  grid: Grid;
  activeShape: number[][];
  position: Position;
  activePiece: TetrominoType;
  clearingRows: number[];
  specialMessage: string | null;
  ghostPosition: Position;
  countdownValue?: number | string | null;
  style?: React.CSSProperties;
  className?: string;
}

const TetrisBoard: React.FC<BoardProps> = ({ 
  grid, 
  activeShape, 
  position, 
  activePiece,
  clearingRows,
  specialMessage,
  ghostPosition,
  countdownValue,
  style,
  className
}) => {
  // Merge active piece and ghost piece into grid for rendering (without locking)
  const displayGrid = useMemo(() => {
    // カウントダウン中はミノを表示しない
    if (countdownValue) return grid.map(row => row.map(cell => ({ ...cell, isGhost: false })));

    // Clone grid
    const display = grid.map(row => row.map(cell => ({ ...cell, isGhost: false })));

    // Only draw active piece/ghost if we aren't currently clearing lines
    if (clearingRows.length === 0) {
      const color = TETROMINOS[activePiece].color;
      
      // 1. Draw Ghost Piece (Behind active)
      // Since we want the active piece to potentially overlap the ghost if they are at the same position, draw ghost first.
      for (let y = 0; y < activeShape.length; y++) {
        for (let x = 0; x < activeShape[y].length; x++) {
          if (activeShape[y][x]) {
            const ny = ghostPosition.y + y;
            const nx = ghostPosition.x + x;
            if (ny >= 0 && ny < display.length && nx >= 0 && nx < display[0].length) {
              // Only draw if cell is empty (should always be true for ghost validity)
              if (!display[ny][nx].filled) {
                 display[ny][nx] = { type: activePiece, filled: true, color: color, isGhost: true };
              }
            }
          }
        }
      }

      // 2. Draw Active Piece (Overwrites ghost if needed)
      for (let y = 0; y < activeShape.length; y++) {
        for (let x = 0; x < activeShape[y].length; x++) {
          if (activeShape[y][x]) {
            const ny = position.y + y;
            const nx = position.x + x;
            if (ny >= 0 && ny < display.length && nx >= 0 && nx < display[0].length) {
              display[ny][nx] = { type: activePiece, filled: true, color: color, isGhost: false };
            }
          }
        }
      }
    }
    console.log('[BOARD] activeShape:', activeShape.length, 
      'position:', position, 
      'piece:', activePiece);
    return display;
  }, [grid, activeShape, position, activePiece, clearingRows, ghostPosition]);

  return (
    <div className={`bg-gray-900 border-2 border-gray-700 p-1 rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.5)] relative overflow-hidden shrink-0${className ? ' ' + className : ''}`}>
      
      {/* Special Message Overlay */}
      {specialMessage && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none p-2">
          <div className="animate-bounce w-full">
             <h1 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-yellow-500 to-red-500 drop-shadow-[0_0_15px_rgba(255,215,0,0.8)] stroke-white stroke-2 transform transition-all duration-300 whitespace-pre-wrap text-center leading-none">
               {specialMessage}
             </h1>
          </div>
          {/* Flash background */}
          <div className="absolute inset-0 bg-white/20 animate-pulse -z-10"></div>
        </div>
      )}

      {/* Countdown Overlay */}
      {countdownValue && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="animate-pulse-fast text-7xl font-black italic text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.9)] scale-110 transition-transform duration-200">
            {countdownValue}
          </div>
          {/* Flash Effect for GO! */}
          {countdownValue === 'GO!' && (
            <div className="absolute inset-0 bg-white/30 animate-ping -z-10"></div>
          )}
        </div>
      )}

      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 1fr)',
          gridTemplateRows: 'repeat(20, 1fr)',
          gap: '1px',
          backgroundColor: '#374151',
          width: style?.width ?? 'min(60vw, 250px)',
          height: style?.height ?? 'min(120vw, 500px)',
        }}
      >
        {displayGrid.map((row, y) => {
          const isClearing = clearingRows.includes(y);
          return row.map((cell, x) => {
            const isGhost = (cell as any).isGhost;
            return (
              <div
                key={`${y}-${x}`}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '1px',
                  backgroundColor: isClearing
                    ? '#ffffff'
                    : isGhost
                      ? `${COLOR_MAP[cell.color]}40`
                      : cell.color === 'garbage-gold'
                        ? '#fbbf24'
                        : cell.color === 'garbage-white'
                          ? '#f3f4f6'
                          : cell.filled
                            ? COLOR_MAP[cell.color]
                            : '#111827',
                  boxShadow: isClearing
                    ? '0 0 15px 5px rgba(255,255,255,0.8)'
                    : isGhost
                      ? `inset 0 0 0 1px ${COLOR_MAP[cell.color]}`
                      : cell.color === 'garbage-gold'
                        ? 'inset 0 0 10px rgba(0,0,0,0.3), 0 0 15px rgba(251,191,36,0.6)'
                        : cell.color === 'garbage-white'
                          ? 'inset 0 0 10px rgba(0,0,0,0.3), 0 0 10px rgba(255,255,255,0.4)'
                          : cell.filled
                            ? `inset 0 0 5px rgba(0,0,0,0.2), 0 0 8px ${COLOR_MAP[cell.color]}80`
                            : 'none',
                  opacity: isClearing ? 1 : cell.filled ? 1 : 0.7,
                  transition: 'background-color 0.1s',
                  animation: isClearing ? 'pulse 0.5s infinite' : 'none',
                }}
              />
            );
          });
        })}
      </div>
    </div>
  );
};

export default TetrisBoard;
