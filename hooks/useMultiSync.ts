import { useState, useEffect, useMemo, useRef, Dispatch, SetStateAction } from 'react';
import { MultiPlayer, RoomConfig } from '../types';
import { multiplayerService } from '../services/multiplayerService';
import { cpuOpponentManager } from '../services/cpuOpponentManager';

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
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);

  // 自分／CPU の pendingGarbage を「差分のみ」取り込むためのキャッシュ
  const lastSeenPendingRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    multiplayerService.addListener(setMultiPlayers);
    multiplayerService.addConfigListener(setRoomConfig);
    return () => {
      multiplayerService.removeListener(setMultiPlayers);
      multiplayerService.removeConfigListener(setRoomConfig);
    };
  }, []);

  const myId = useMemo(() => multiplayerService.getPlayerId(), []);

  const me = useMemo(
    () => multiPlayers.find(p => p.id === myId),
    [multiPlayers, myId]
  );

  const isHost = !!me?.isHost;

  // 自分以外（人＋CPU）。slotIndex で並び替え（ホスト=0、追加枠=1,2…）
  const opponents = useMemo<MultiPlayer[]>(() => {
    if (gameMode !== 'MULTI') return [];
    return multiPlayers
      .filter(p => p.id !== myId)
      .sort((a, b) => (a.slotIndex ?? 99) - (b.slotIndex ?? 99));
  }, [multiPlayers, gameMode, myId]);

  // 互換: 旧 gameOpponent（最初の相手1人）
  const gameOpponent = opponents[0];

  // 勝敗判定：自分以外が全員 defeated になったら WIN
  useEffect(() => {
    if (gameMode !== 'MULTI') return;
    if (!gameStarted || gameOver || isWinner || isFinishing) return;
    if (currentScreen !== 'game') return;
    if (opponents.length === 0) return;
    const allDead = opponents.every(p => p.status === 'defeated');
    if (allDead) {
      console.log('[useMultiSync] all opponents defeated -> WIN');
      triggerFinishAnimation('win');
    }
  }, [opponents, gameMode, gameStarted, gameOver, isWinner, isFinishing, currentScreen, triggerFinishAnimation]);

  // 自分が受けた garbage を取り込み（差分方式）
  useEffect(() => {
    if (gameMode !== 'MULTI' || !gameStarted || !me) return;
    const last = lastSeenPendingRef.current.get(myId) ?? 0;
    const cur = me.pendingGarbage ?? 0;
    if (cur > last) {
      const diff = cur - last;
      console.log(`[useMultiSync] incoming garbage to me +${diff}`);
      setPendingGarbage(prev => prev + diff);
    }
    lastSeenPendingRef.current.set(myId, cur);
    if (cur > 0) multiplayerService.resetPendingGarbageFor(myId);
  }, [me, gameMode, gameStarted, myId, setPendingGarbage]);

  // ホスト側：CPU プレイヤーへの攻撃（Firebase 上の pendingGarbage 増分）をローカル CPU instance に渡してリセット
  useEffect(() => {
    if (gameMode !== 'MULTI' || !gameStarted || !isHost) return;
    multiPlayers.forEach(p => {
      if (!p.isCpu) return;
      const last = lastSeenPendingRef.current.get(p.id) ?? 0;
      const cur = p.pendingGarbage ?? 0;
      if (cur > last) {
        const diff = cur - last;
        cpuOpponentManager.get(p.id)?.receiveAttack(diff);
      }
      lastSeenPendingRef.current.set(p.id, cur);
      if (cur > 0) multiplayerService.resetPendingGarbageFor(p.id);
    });
  }, [multiPlayers, gameMode, gameStarted, isHost]);

  return { multiPlayers, opponents, gameOpponent, roomConfig, isHost, me };
}
