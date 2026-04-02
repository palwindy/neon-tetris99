import { useState, useEffect, useMemo, Dispatch, SetStateAction } from 'react';
import { MultiPlayer } from '../types';
import { multiplayerService } from '../services/multiplayerService';

interface UseMultiSyncProps {
  gameMode: string;
  gameStarted: boolean;
  gameOver: boolean;
  isWinner: boolean;
  currentScreen: string;
  isFinishing: boolean;
  triggerFinishAnimation: (type: 'win' | 'lose') => void;
  setPendingGarbage: Dispatch<SetStateAction<number>>;
}

export function useMultiSync({
  gameMode,
  gameStarted,
  gameOver,
  isWinner,
  currentScreen,
  isFinishing,
  triggerFinishAnimation,
  setPendingGarbage,
}: UseMultiSyncProps) {
  const [multiPlayers, setMultiPlayers] = useState<MultiPlayer[]>([]);

  // Firebase リスナー登録・解除
  useEffect(() => {
    multiplayerService.addListener(setMultiPlayers);
    return () => multiplayerService.removeListener(setMultiPlayers);
  }, []);

  // 相手プレイヤーを特定
  const gameOpponent = useMemo(() => {
    if (gameMode !== 'MULTI') return undefined;
    const myId = multiplayerService.getPlayerId();
    return multiPlayers.find(p => p.id !== myId);
  }, [multiPlayers, gameMode]);

  // 相手が defeated になったら勝利アニメーションをトリガー
  useEffect(() => {
    if (gameMode !== 'MULTI') return;
    const opponent = gameOpponent;
    if (
      opponent && opponent.status === 'defeated' &&
      !gameOver && !isWinner && gameStarted &&
      currentScreen === 'game' && !isFinishing
    ) {
      console.log(`[App] Opponent ${opponent.id} defeated. Triggering win animation.`);
      triggerFinishAnimation('win');
    }
  }, [multiPlayers, gameOver, isWinner, gameStarted, gameMode, currentScreen, isFinishing, triggerFinishAnimation]);

  // Firebase の pendingGarbage をローカルへ取り込み、Firebase 側をリセット
  useEffect(() => {
    if (gameMode !== 'MULTI' || !gameStarted) return;
    const myId = multiplayerService.getPlayerId();
    const me = multiPlayers.find(p => p.id === myId);
    if (me && me.pendingGarbage > 0) {
      console.log(`[App] Incoming garbage from Firebase: ${me.pendingGarbage}`);
      setPendingGarbage(prev => prev + me.pendingGarbage);
      multiplayerService.resetPendingGarbage();
    }
  }, [multiPlayers, gameMode, gameStarted, setPendingGarbage]);

  return { multiPlayers, gameOpponent };
}
