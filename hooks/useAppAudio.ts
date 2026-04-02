import { useState, useEffect, useCallback } from 'react';
import { audioService } from '../services/audioService';

interface UseAppAudioProps {
  showTitle: boolean;
  showSplash: boolean;
  currentScreen: string;
  gameStarted: boolean;
  paused: boolean;
  gameOver: boolean;
  isWinner: boolean;
  togglePause: () => void;
  setShowSplash: (v: boolean) => void;
}

export function useAppAudio({
  showTitle,
  showSplash,
  currentScreen,
  gameStarted,
  paused,
  gameOver,
  isWinner,
  togglePause,
  setShowSplash,
}: UseAppAudioProps) {
  const [bgmOn, setBgmOn] = useState(true);
  const [seOn, setSeOn] = useState(true);
  const [audioReady, setAudioReady] = useState(false);

  const handleBgmToggle = useCallback((on: boolean) => {
    setBgmOn(on);
    audioService.setBgmEnabled(on);
  }, []);

  const handleSeToggle = useCallback((on: boolean) => {
    setSeOn(on);
    audioService.setSeEnabled(on);
  }, []);

  // AudioService 初期化
  useEffect(() => {
    audioService.setOnReady(() => setAudioReady(true));
  }, []);

  // スプラッシュ自動終了（audioReady になったら 1.5s 後に閉じる）
  useEffect(() => {
    if (audioReady && showSplash) {
      const timer = setTimeout(() => {
        if (showSplash) setShowSplash(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [audioReady, showSplash, setShowSplash]);

  // BGM ステートマシン
  useEffect(() => {
    if (showTitle || currentScreen === 'matching') {
      if (audioReady) audioService.startBGM('title');
    } else if (gameStarted && !gameOver && !isWinner) {
      if (paused) {
        audioService.pauseBGM?.();
      } else {
        if (audioService.getBgmIsPaused?.()) {
          audioService.resumeBGM?.();
        } else {
          audioService.startBGM('game');
        }
      }
    } else if (isWinner) {
      audioService.startBGM('win');
    } else if (!gameOver && !isWinner) {
      audioService.stopBGM();
    }
  }, [showTitle, showSplash, audioReady, currentScreen, gameStarted, paused, gameOver, isWinner]);

  // Page Visibility / blur / focus
  useEffect(() => {
    const handleInactivate = () => {
      audioService.pauseBGM();
      if (currentScreen === 'game' && gameStarted && !gameOver && !isWinner && !paused) {
        togglePause();
      }
    };
    const handleActivate = () => {
      if (showTitle || (currentScreen === 'game' && !paused)) {
        audioService.resumeBGM();
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') handleInactivate();
      else handleActivate();
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleInactivate);
    window.addEventListener('focus', handleActivate);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleInactivate);
      window.removeEventListener('focus', handleActivate);
    };
  }, [currentScreen, gameStarted, gameOver, isWinner, paused, showTitle, togglePause]);

  // 勝利 BGM（1.8s 遅延）
  useEffect(() => {
    if (isWinner && audioService.getCurrentBGM() !== 'win') {
      const timer = setTimeout(() => audioService.startBGM('win'), 1800);
      return () => clearTimeout(timer);
    }
  }, [isWinner]);

  // 敗北 BGM（1.8s 遅延）
  useEffect(() => {
    if (gameOver && audioService.getCurrentBGM() !== 'lose') {
      const timer = setTimeout(() => audioService.startBGM('lose'), 1800);
      return () => clearTimeout(timer);
    }
  }, [gameOver]);

  return { bgmOn, seOn, audioReady, handleBgmToggle, handleSeToggle };
}
