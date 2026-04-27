import React from 'react';
import TetrisBoard from '../TetrisBoard';
import Overlays from '../ui/Overlays';
import { DPad, ActionButtons } from './Controller';
import { SidePanel } from './SidePanel';
import { NextPanel } from './NextPanel';
import { GameHeader } from './GameHeader';
import { Grid, Position, TetrominoType, MultiPlayer, GameMode } from '../../types';

interface OverlayProps {
  playerAttack: number;
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

interface PortraitLayoutProps {
  version: string;
  // ボード描画
  grid: Grid;
  activeShape: number[][];
  position: Position;
  activePiece: TetrominoType | null;
  clearingRows: number[];
  specialMessage: string | null;
  ghostPosition: Position | null;
  countdownValue: string | number | null;
  // ピース管理
  nextQueue: TetrominoType[];
  holdPiece: TetrominoType | null;
  // スコア
  score: number;
  lines: number;
  level: number;
  // ゲーム状態
  gameMode: GameMode;
  gameStarted: boolean;
  paused: boolean;
  // CPU
  cpuHealth: number;
  blinkDuration: string;
  // マルチ
  pendingGarbage: number;
  gameOpponents: MultiPlayer[];
  // 操作
  move: (dir: string) => void;
  hardDrop: () => void;
  rotate: () => void;
  rotateCCW: () => void;
  hold: () => void;
  togglePause: () => void;
  // オーバーレイ
  overlayProps: OverlayProps;
}

export function PortraitLayout({
  version,
  grid, activeShape, position, activePiece,
  clearingRows, specialMessage, ghostPosition, countdownValue,
  nextQueue, holdPiece,
  score, lines, level,
  gameMode, gameStarted, paused,
  cpuHealth, blinkDuration,
  pendingGarbage, gameOpponents,
  move, hardDrop, rotate, rotateCCW, hold, togglePause,
  overlayProps,
}: PortraitLayoutProps) {
  return (
    <div className="w-full h-full flex flex-col items-center landscape:hidden relative z-0">
      <GameHeader version={version} level={level} lines={lines} score={score} />

      <div className="flex-1 w-full max-w-lg flex items-start justify-center pt-2 pb-0 gap-1 min-h-0 relative">
        <SidePanel
          holdPiece={holdPiece}
          pendingGarbage={pendingGarbage}
          paused={paused}
          togglePause={togglePause}
          gameMode={gameMode}
          gameStarted={gameStarted}
          gameOpponents={gameOpponents}
          variant="portrait"
        />

        <div className="relative shrink-0 flex items-start">
          <TetrisBoard
            grid={grid}
            activeShape={activeShape}
            position={position}
            activePiece={activePiece}
            clearingRows={clearingRows}
            specialMessage={specialMessage}
            ghostPosition={ghostPosition}
            countdownValue={countdownValue}
          />
          <Overlays {...overlayProps} />
        </div>

        <NextPanel
          nextQueue={nextQueue}
          gameMode={gameMode}
          gameStarted={gameStarted}
          cpuHealth={cpuHealth}
          pendingGarbage={pendingGarbage}
          blinkDuration={blinkDuration}
          variant="portrait"
        />
      </div>

      <div
        className="w-full max-w-lg shrink-0 z-10 touch-none"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 8px)',
          paddingLeft: '8px',
          paddingRight: '8px',
          paddingTop: '6px',
        }}
      >
        <div className="flex justify-between items-end">
          <DPad move={move} hardDrop={hardDrop} />
          <ActionButtons hold={hold} rotate={rotate} rotateCCW={rotateCCW} />
        </div>
      </div>
    </div>
  );
}
