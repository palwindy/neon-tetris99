import React from 'react';

interface ScorePanelProps {
  score: number;
  level: number;
  lines: number;
}

export function ScorePanel({ score, level, lines }: ScorePanelProps) {
  return (
    <div className="flex flex-col items-center gap-2 transform scale-90 origin-top mt-2">
      <div className="bg-gray-900 px-4 py-2 rounded border border-gray-800 font-mono text-xs text-center w-32">
        SCORE <span className="text-white block text-xl">{score}</span>
      </div>
      <div className="flex gap-2">
        <div className="bg-gray-900 px-2 py-1 rounded border border-gray-800 whitespace-nowrap text-[10px] w-14 text-center">
          LVL <span className="text-yellow-400 block text-sm">{level}</span>
        </div>
        <div className="bg-gray-900 px-2 py-1 rounded border border-gray-800 whitespace-nowrap text-[10px] w-14 text-center">
          LINES <span className="text-green-400 block text-sm">{lines}</span>
        </div>
      </div>
    </div>
  );
}
