// hooks/useCpuConfig.tsx
import React, { useState } from 'react';

// App.tsx Version: 0.03 連携用
const useCpuConfig = (onSelect: (level: number) => void) => {
  const [cpuMaxHealth, setCpuMaxHealth] = useState<number>(100);
  const [showLevelModal, setShowLevelModal] = useState<boolean>(false);

  const calculateCpuHealth = (level: number): void => {
    setCpuMaxHealth(level * 10);
    setShowLevelModal(false);
    onSelect(level);
  };

  const openLevelModal = () => setShowLevelModal(true);

  // モーダル本体のJSX
  const LevelSelectModalComponent = showLevelModal ? (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="border-2 border-cyan-500 bg-black p-6 rounded-md shadow-[0_0_20px_rgba(6,182,212,0.5)]">
        <h1 className="text-xl font-bold text-center text-cyan-500 mb-6 tracking-widest">SELECT CPU LEVEL</h1>
        <div className="grid grid-cols-5 gap-3">
          {[...Array(10)].map((_, index) => (
            <button
              key={index}
              className="bg-transparent border border-cyan-500/50 hover:border-cyan-500 hover:bg-cyan-500 text-cyan-400 hover:text-black font-bold py-3 px-4 rounded transition-all active:scale-95"
              onClick={() => calculateCpuHealth(index + 1)}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  return {
    cpuMaxHealth,
    showLevelModal,
    openLevelModal,
    LevelSelectModalComponent
  };
};

export default useCpuConfig;