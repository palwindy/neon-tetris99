import React from 'react';
import TetrisBoard from '../TetrisBoard';
import Overlays from '../ui/Overlays';
import { DPad, ActionButtons } from './Controller';
import { SidePanel } from './SidePanel';
import { NextPanel } from './NextPanel';
import { ScorePanel } from './ScorePanel';
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

interface LandscapeLayoutProps {
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
  gameOpponent: MultiPlayer | undefined;
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

export function LandscapeLayout({
  version,
  grid, activeShape, position, activePiece,
  clearingRows, specialMessage, ghostPosition, countdownValue,
  nextQueue, holdPiece,
  score, lines, level,
  gameMode, gameStarted, paused,
  cpuHealth, blinkDuration,
  pendingGarbage, gameOpponent,
  move, hardDrop, rotate, rotateCCW, hold, togglePause,
  overlayProps,
}: LandscapeLayoutProps) {
  return (
    <div className="hidden landscape:flex w-full h-full flex-row overflow-hidden relative z-0">
      {/* 左カラム：タイトル + DPad */}
      <div className="flex-1 flex flex-col items-center justify-between pb-1 pt-2 gap-2 bg-gray-900/20 border-r border-gray-800/50 min-w-0">
        <div className="mt-2 flex items-baseline">
          <h1 className="text-xs font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            NEON TETRIS 99
          </h1>
          <span className="text-xs text-gray-500 ml-1.5">v{version}</span>
        </div>
        <div className="mb-2">
          <DPad move={move} hardDrop={hardDrop} />
        </div>
      </div>

      {/* 中央カラム：SidePanel + ボード + NextPanel */}
      <div className="shrink-0 h-full flex items-center justify-center gap-2 px-2">
        <SidePanel
          holdPiece={holdPiece}
          pendingGarbage={pendingGarbage}
          paused={paused}
          togglePause={togglePause}
          gameMode={gameMode}
          gameStarted={gameStarted}
          gameOpponent={gameOpponent}
          variant="landscape"
        />

        <div className="relative h-[94vh] aspect-[1/2] shadow-2xl flex items-start">
          <TetrisBoard
            grid={grid}
            activeShape={activeShape}
            position={position}
            activePiece={activePiece}
            clearingRows={clearingRows}
            specialMessage={specialMessage}
            ghostPosition={ghostPosition}
            countdownValue={countdownValue}
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
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
          variant="landscape"
        />
      </div>

      {/* 右カラム：スコア + ActionButtons */}
      <div className="flex-1 flex flex-col items-center justify-between pb-8 pt-2 gap-2 bg-gray-900/20 border-l border-gray-800/50 min-w-0">
        <ScorePanel score={score} level={level} lines={lines} />
        <div className="mb-2">
          <ActionButtons hold={hold} rotate={rotate} rotateCCW={rotateCCW} />
        </div>
      </div>
    </div>
  );
}
