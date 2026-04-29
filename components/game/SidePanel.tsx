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
  gameOpponents: MultiPlayer[];
  variant: 'portrait' | 'landscape';
}

export function SidePanel({
  holdPiece,
  pendingGarbage,
  paused,
  togglePause,
  gameMode,
  gameStarted,
  gameOpponents,
  variant,
}: SidePanelProps) {
  const isPortrait = variant === 'portrait';

  // VS MULTI 中は PAUSE 無効化
  const pauseDisabled = gameMode === 'MULTI';

  return (
    <div className={`flex flex-col items-center justify-between pt-4 pb-4 ${isPortrait ? 'w-16 h-full' : 'w-12 h-full'} relative`}>
      <div className="flex flex-col items-center">
        <GarbageGauge pendingGarbage={pendingGarbage} variant={variant} />

        <div className={`${isPortrait ? 'text-[10px] mb-1' : 'text-[8px]'} text-gray-500 font-bold`}>
          HOLD
        </div>

        <div className={`${isPortrait ? 'w-14 h-14' : 'w-12 h-12'} bg-black border-2 border-gray-700 rounded flex items-center justify-center relative`}>
          <MiniPieceIcon type={holdPiece} />
        </div>

        {/* VS MULTI のミニ画面（複数）— HOLD の下、PAUSEの上に縦に積む */}
        {gameMode === 'MULTI' && gameStarted && gameOpponents.length > 0 && (
          <div className="mt-3 flex flex-col items-center gap-1.5">
            {gameOpponents.map(opp => (
              <MiniOpponentBoard key={opp.id} opponent={opp} />
            ))}
          </div>
        )}

        {isPortrait ? (
          <div className="mt-8">
            <ControlButton
              onClick={pauseDisabled ? () => {} : togglePause}
              className={`w-10 h-10 rounded-full border border-gray-600 flex items-center justify-center ${pauseDisabled ? 'bg-gray-900 text-gray-700 cursor-not-allowed opacity-40' : 'bg-gray-800 text-gray-400 active:bg-gray-700'}`}
              cooldown={200}
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}
            </ControlButton>
          </div>
        ) : (
          <ControlButton
            onClick={pauseDisabled ? () => {} : togglePause}
            className={`w-8 h-8 mt-2 rounded-full border border-gray-600 flex items-center justify-center ${pauseDisabled ? 'bg-gray-900 text-gray-700 cursor-not-allowed opacity-40' : 'bg-gray-800 text-gray-400 active:bg-gray-700'}`}
            cooldown={200}
          >
            {paused ? <Play size={12} /> : <Pause size={12} />}
          </ControlButton>
        )}
      </div>
    </div>
  );
}
