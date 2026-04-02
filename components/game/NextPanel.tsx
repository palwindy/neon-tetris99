import React from 'react';
import { NextQueueItem } from './PieceDisplay';
import { CpuStatusDisplay } from './CpuStatus';
import { TetrominoType } from '../../types';

interface NextPanelProps {
  nextQueue: TetrominoType[];
  gameMode: string;
  gameStarted: boolean;
  cpuHealth: number;
  pendingGarbage: number;
  blinkDuration: string;
  variant: 'portrait' | 'landscape';
}

export function NextPanel({
  nextQueue,
  gameMode,
  gameStarted,
  cpuHealth,
  pendingGarbage,
  blinkDuration,
  variant,
}: NextPanelProps) {
  const isPortrait = variant === 'portrait';

  return (
    <div className={`flex flex-col items-center justify-between ${isPortrait ? 'pt-4 pb-2 w-16 h-full' : 'mt-8 mb-4 w-12 h-full py-4'}`}>
      <div className={`flex flex-col items-center ${!isPortrait ? 'gap-2' : ''}`}>
        <div className={`${isPortrait ? 'text-[10px] mb-1' : 'text-[8px]'} text-gray-500 font-bold`}>
          NEXT
        </div>
        <div className="flex flex-col gap-1">
          {nextQueue.slice(0, 3).map((type, i) => (
            <NextQueueItem key={i} type={type} index={i} />
          ))}
        </div>
      </div>

      {gameMode === 'CPU' && gameStarted && (
        isPortrait ? (
          <div className="mb-10">
            <CpuStatusDisplay
              cpuHealth={cpuHealth}
              pendingGarbage={pendingGarbage}
              blinkDuration={blinkDuration}
              vertical={true}
            />
          </div>
        ) : (
          <CpuStatusDisplay
            cpuHealth={cpuHealth}
            pendingGarbage={pendingGarbage}
            blinkDuration={blinkDuration}
            vertical={false}
          />
        )
      )}
    </div>
  );
}
