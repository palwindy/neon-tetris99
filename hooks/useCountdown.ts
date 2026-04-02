import { useCallback } from 'react';
import { audioService } from '../services/audioService';
import { GameMode } from '../types';

interface UseCountdownProps {
  resetGame: (mode: GameMode, start: boolean) => void;
  startGame: () => void;
  setIsCountdown: (v: boolean) => void;
  setCountdownValue: (v: string | number | null) => void;
}

export function useCountdown({
  resetGame,
  startGame,
  setIsCountdown,
  setCountdownValue,
}: UseCountdownProps) {
  const runCountdownSequence = useCallback(async (mode: GameMode) => {
    setIsCountdown(true);
    setCountdownValue('READY');
    resetGame(mode, false); // 表示はするが落下させない
    audioService.stopBGM();
    audioService.playReady();

    await new Promise(r => setTimeout(r, 1200));

    for (let i = 3; i >= 1; i--) {
      setCountdownValue(i);
      audioService.playCountdown();
      await new Promise(r => setTimeout(r, 1000));
    }

    setCountdownValue('GO!');
    audioService.playGo();
    startGame(); // 落下開始（BGM は useAppAudio の effect が自動起動）

    await new Promise(r => setTimeout(r, 800));
    setCountdownValue(null);
    setIsCountdown(false);
  }, [resetGame, startGame, setIsCountdown, setCountdownValue]);

  return { runCountdownSequence };
}
