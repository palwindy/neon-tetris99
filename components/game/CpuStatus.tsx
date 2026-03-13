import React from 'react';
import { Bot, Skull } from 'lucide-react';

interface CpuStatusDisplayProps {
  cpuHealth: number;
  pendingGarbage: number;
  blinkDuration: string;
  vertical?: boolean;
}

export const CpuStatusDisplay: React.FC<CpuStatusDisplayProps> = ({ cpuHealth, pendingGarbage, blinkDuration, vertical = true }) => {
  const isPanic = cpuHealth < 30;
  return (
    <div className="flex flex-col items-center animate-in slide-in-from-right duration-500 relative">
      <style>{`
        @keyframes panic-blink {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0.4; }
        }
      `}</style>
      <div className={`relative transition-transform ${isPanic ? 'animate-[shake_0.2s_ease-in-out_infinite]' : ''}`}>
        <div className={`w-12 h-12 ${isPanic ? 'bg-red-950 border-red-400' : 'bg-red-900/50 border-red-500'} rounded-full border-2 flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.5)] z-10 relative`}>
          {pendingGarbage > 0
            ? <span className="text-white font-black text-xl animate-pulse">{pendingGarbage}</span>
            : isPanic ? <Skull className="text-white animate-pulse" size={24} /> : <Bot className="text-red-300" size={24} />
          }
        </div>
        <div
          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border border-white"
          style={{ animation: `panic-blink ${blinkDuration} cubic-bezier(0, 0, 0.2, 1) infinite` }}
        />
      </div>
      <div className={`mt-2 ${vertical ? 'w-2 h-24' : 'w-1.5 h-20'} bg-gray-800 rounded-full overflow-hidden border border-gray-700 relative`}>
        <div
          className={`absolute bottom-0 w-full transition-all duration-300 ${isPanic ? 'bg-red-600' : 'bg-gradient-to-t from-red-600 to-yellow-500'}`}
          style={{ height: `${Math.max(0, Math.min(100, cpuHealth))}%` }}
        />
      </div>
      <div className="text-[8px] font-mono mt-1 text-red-400">{Math.ceil(cpuHealth)}HP</div>
    </div>
  );
};
