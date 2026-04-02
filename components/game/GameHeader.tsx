import React from 'react';

interface GameHeaderProps {
  version: string;
  level: number;
  lines: number;
  score: number;
}

export function GameHeader({ version, level, lines, score }: GameHeaderProps) {
  return (
    <div className="w-full max-w-lg px-4 py-1 flex justify-between items-center bg-neutral-900 border-b border-neutral-800 z-10 shrink-0 h-10">
      <div className="flex items-baseline">
        <h1 className="text-xs font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
          NEON TETRIS 99
        </h1>
        <span className="text-xs text-gray-400 ml-2">v{version}</span>
      </div>
      <div className="flex gap-4 font-mono text-xs">
        <div>LVL <span className="text-yellow-400">{level}</span></div>
        <div>LINES <span className="text-green-400">{lines}</span></div>
        <div>SCORE <span className="text-white">{score}</span></div>
      </div>
    </div>
  );
}
