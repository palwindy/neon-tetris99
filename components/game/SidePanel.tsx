import React from 'react';
import { Pause, Play } from 'lucide-react';
import { ControlButton } from '../Button';
import { MiniPieceIcon } from './PieceDisplay';
import { MiniOpponentBoard } from './MiniOpponentBoard';
import { GarbageGauge } from './GarbageGauge';
import { TetrominoType, MultiPlayer } from '../../types';

interface SidePanelProps {
  holdPiece: TetrominoType | null;
  pendingGarbage: number;
  paused: boolean;
  togglePause: () => void;
  gameMode: string;
  gameStarted: boolean;
  gameOpponent: MultiPlayer | undefined;
  variant: 'portrait' | 'landscape';
}

export function SidePanel({
  holdPiece,
  pendingGarbage,
  paused,
  togglePause,
  gameMode,
  gameStarted,
  gameOpponent,
  variant,
}: SidePanelProps) {
  const isPortrait = variant === 'portrait';

  return (
    <div className={`flex flex-col items-center justify-between pt-4 pb-4 ${isPortrait ? 'w-16 h-full' : 'w-12 h-[94vh]'} relative`}>
      <div className="flex flex-col items-center">
        <GarbageGauge pendingGarbage={pendingGarbage} variant={variant} />

        <div className={`${isPortrait ? 'text-[10px] mb-1' : 'text-[8px]'} text-gray-500 font-bold`}>
          HOLD
        </div>

        <div className={`${isPortrait ? 'w-14 h-14' : 'w-12 h-12'} bg-black border-2 border-gray-700 rounded flex items-center justify-center relative`}>
          <MiniPieceIcon type={holdPiece} />
        </div>

        {isPortrait ? (
          <div className="mt-8">
            <ControlButton
              onClick={togglePause}
              className="w-10 h-10 rounded-full border border-gray-600 bg-gray-800 text-gray-400 active:bg-gray-700 flex items-center justify-center"
              cooldown={200}
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}
            </ControlButton>
          </div>
        ) : (
          <ControlButton
            onClick={togglePause}
            className="w-8 h-8 mt-2 rounded-full border border-gray-600 bg-gray-800 text-gray-400 active:bg-gray-700 flex items-center justify-center"
            cooldown={200}
          >
            {paused ? <Play size={12} /> : <Pause size={12} />}
          </ControlButton>
        )}
      </div>

      {gameMode === 'MULTI' && gameStarted && (
        <div className="mb-4">
          <MiniOpponentBoard opponent={gameOpponent} />
        </div>
      )}
    </div>
  );
}
