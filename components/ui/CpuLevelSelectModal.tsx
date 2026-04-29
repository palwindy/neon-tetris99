
import React from 'react';
import { Bot, X, Timer } from 'lucide-react';
import { audioService } from '../../services/audioService';
import { CpuBestTimes, formatTime } from '../../services/recordsService';

interface CpuLevelSelectModalProps {
  onSelect: (level: 1 | 2 | 3 | 4 | 5) => void;
  onCancel: () => void;
  bestTimes?: CpuBestTimes;
}

const LEVEL_INFO: Record<number, { label: string; color: string; desc: string }> = {
  1: { label: 'EASY',   color: '#22c55e', desc: '入門レベル' },
  2: { label: 'NORMAL', color: '#06b6d4', desc: '基本' },
  3: { label: 'HARD',   color: '#a855f7', desc: '中級' },
  4: { label: 'EXPERT', color: '#f97316', desc: '上級' },
  5: { label: 'MASTER', color: '#ef4444', desc: '最強' },
};

const CpuLevelSelectModal: React.FC<CpuLevelSelectModalProps> = ({ onSelect, onCancel, bestTimes = {} }) => {
  const handleCancel = () => { audioService.playCancel(); onCancel(); };
  const handleSelect = (lv: 1 | 2 | 3 | 4 | 5) => { audioService.playOk(); onSelect(lv); };

  return (
    <div className="fixed inset-0 z-[110] flex flex-col"
      style={{ background: 'radial-gradient(ellipse at center, #1a0a2e 0%, #0a0a14 80%)' }}>
      {/* ヘッダー */}
      <div className="flex justify-between items-center px-5 py-2 border-b border-gray-800 shrink-0">
        <h2 className="text-lg font-black flex items-center gap-2"
          style={{ color: '#06b6d4', textShadow: '0 0 10px #06b6d4' }}>
          <Bot size={20} /> SELECT CPU LEVEL
        </h2>
        <button onClick={handleCancel} className="p-2 hover:bg-gray-800 rounded-full">
          <X className="text-gray-400" size={18} />
        </button>
      </div>

      {/* 中央コンテンツ：レベルボタン横並び */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="flex gap-3 w-full max-w-3xl justify-center">
          {([1, 2, 3, 4, 5] as const).map(lv => {
            const info = LEVEL_INFO[lv];
            const best = bestTimes[lv];
            return (
              <button key={lv} onClick={() => handleSelect(lv)}
                className="flex-1 max-w-[140px] flex flex-col items-center justify-center gap-1 py-4 rounded-xl border-2 bg-black/40 hover:bg-black/60 active:scale-95 transition-all"
                style={{
                  borderColor: info.color,
                  boxShadow: `0 0 12px ${info.color}55`,
                }}>
                <span className="text-3xl font-black"
                  style={{ color: info.color, textShadow: `0 0 8px ${info.color}` }}>Lv{lv}</span>
                <span className="text-sm font-bold tracking-wider" style={{ color: info.color }}>{info.label}</span>
                <span className="text-[10px] text-gray-400 tracking-wide">{info.desc}</span>
                {/* ベストタイム */}
                {best !== undefined ? (
                  <div className="flex items-center gap-0.5 mt-1 text-[10px] text-yellow-300 font-mono">
                    <Timer size={9} />
                    {formatTime(best)}
                  </div>
                ) : (
                  <div className="mt-1 text-[10px] text-gray-600 font-mono">-- : --</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CpuLevelSelectModal;
