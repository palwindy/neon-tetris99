
import React, { useState, useEffect, useMemo } from 'react';
import { X, Settings } from 'lucide-react';
import { multiplayerService } from '../../services/multiplayerService';
import { MultiPlayer } from '../../types';

interface MatchingScreenProps {
  onGameStart: (roomId: string, players: MultiPlayer[]) => void;
  onBack: () => void;
  onOpenSettings: () => void;
}

export const MatchingScreen: React.FC<MatchingScreenProps> = ({ onGameStart, onBack, onOpenSettings }) => {
  const [players, setPlayers] = useState<MultiPlayer[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [roomId, setRoomId] = useState(multiplayerService.getRoomId());
  const [inputRoomId, setInputRoomId] = useState('');
  const [copied, setCopied] = useState(false);
  const myName = useMemo(() => multiplayerService.getPlayerName(), []);

  const you = useMemo(() => players.find(p => p.id === multiplayerService.getPlayerId()), [players]);
  const opponent = useMemo(() => players.find(p => p.id !== multiplayerService.getPlayerId()), [players]);
  const myStatus = you?.status;

  useEffect(() => {
    multiplayerService.joinRoom(roomId);
    multiplayerService.addListener(setPlayers);
    return () => {
      multiplayerService.removeListener(setPlayers);
      // multiplayerService.leaveRoom() は App.tsx 側で管理するか、ここでの leaveRoom は慎重に。
      // 今回は App.tsx が全体を管理する方針にするため、ここでは leave しない
    };
  }, [roomId]);

  useEffect(() => {
    const allReady = players.length >= 2 && players.every(p => p.status === 'ready');
    if (allReady && countdown === null) {
      setCountdown(3);
    }
  }, [players, countdown, onGameStart, roomId]);
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      const timer = window.setTimeout(() => onGameStart(roomId, players), 800);
      return () => clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setCountdown(c => (c ?? 1) - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onGameStart, roomId]); // playersを依存から外し、同期更新によるリセットを防ぐ

  const handleReady = () => {
    multiplayerService.setReady();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinRoom = (newRoomId: string) => {
    if (newRoomId.length === 4) {
      setRoomId(newRoomId);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: 'rgba(5, 5, 20, 0.85)',
        backdropFilter: 'blur(18px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.4)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button onClick={onBack} className="text-gray-400 hover:text-white p-1">
          <X size={24} />
        </button>
        <h1 className="text-xl font-black tracking-widest"
            style={{ color: '#e040fb', textShadow: '0 0 12px #e040fb, 0 0 24px #7c4dff' }}>
          VS MULTI
        </h1>
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg border border-gray-700 bg-gray-800/60 text-gray-400 hover:text-white hover:border-gray-500 active:scale-95 transition-all flex items-center gap-1"
        >
          <Settings size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-4">
        <div className="rounded-xl border border-purple-500/40 bg-black/40 p-3 text-center">
          <p className="text-xs text-gray-400 mb-1 tracking-widest">ROOM ID</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl font-black tracking-[0.3em]"
                  style={{ color: '#e040fb', textShadow: '0 0 16px #e040fb' }}>
              {roomId}
            </span>
            <button onClick={handleCopy}
                    className="text-xs px-2 py-1 rounded border border-purple-400/50 text-purple-300 hover:bg-purple-900/40">
              {copied ? '✓ コピー済' : 'コピー'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex-1 rounded-xl border p-3 text-center transition-all duration-300 ${myStatus === 'ready' ? 'border-green-400 shadow-[0_0_12px_#4ade80]' : 'border-purple-500/50'} bg-black/40`}>
            <p className="text-[10px] text-purple-300 font-bold tracking-widest mb-1">YOU</p>
            <p className="text-sm font-bold text-white truncate">{myName}</p>
            <div className={`mt-2 text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full inline-block ${myStatus === 'ready' ? 'bg-green-500/30 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
              {myStatus === 'ready' ? '✓ READY' : 'WAITING'}
            </div>
          </div>

          <div className="text-2xl font-black shrink-0" style={{ color: '#ff4081', textShadow: '0 0 10px #ff4081' }}>
            VS
          </div>

          <div className={`flex-1 rounded-xl border p-3 text-center transition-all duration-300 ${opponent ? (opponent.status === 'ready' ? 'border-green-400 shadow-[0_0_12px_#4ade80]' : 'border-cyan-500/50') : 'border-gray-700'} bg-black/40`}>
            {opponent ? (
              <>
                <p className="text-[10px] text-cyan-300 font-bold tracking-widest mb-1">OPPONENT</p>
                <p className="text-sm font-bold text-white truncate">{opponent.name}</p>
                <div className={`mt-2 text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full inline-block ${opponent.status === 'ready' ? 'bg-green-500/30 text-green-300' : 'bg-cyan-900/30 text-cyan-300'}`}>
                  {opponent.status === 'ready' ? '✓ READY' : 'FOUND'}
                </div>
              </>
            ) : (
              <>
                <p className="text-[10px] text-gray-500 font-bold tracking-widest mb-1">OPPONENT</p>
                <div className="flex justify-center my-1">
                  <div className="w-5 h-5 border-2 border-t-transparent border-purple-400 rounded-full animate-spin" />
                </div>
                <p className="text-[10px] text-gray-500 animate-pulse">検索中...</p>
              </>
            )}
          </div>
        </div>

        {countdown !== null && (
          <div className="text-center py-2">
            <span className="text-6xl font-black animate-ping inline-block" style={{ color: '#e040fb', textShadow: '0 0 20px #e040fb' }}>
              {countdown === 0 ? 'GO!' : countdown}
            </span>
          </div>
        )}

        {countdown === null && (
          <button
            disabled={!opponent || myStatus === 'ready'}
            onClick={handleReady}
            className={`w-full py-4 rounded-xl font-black text-lg tracking-widest transition-all duration-300 ${!opponent || myStatus === 'ready' ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_16px_#a855f7]'}`}>
            {myStatus === 'ready' ? '✓ 準備完了！相手を待っています' : '準備完了'}
          </button>
        )}

        <div className="rounded-xl border border-gray-700 bg-black/30 p-3">
          <p className="text-xs text-gray-400 mb-2 tracking-widest text-center">別のルームIDで参加</p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              placeholder="0000"
              value={inputRoomId}
              onChange={e => setInputRoomId(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="flex-1 bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-white text-center text-xl tracking-[0.3em] font-bold focus:border-purple-400 outline-none"
            />
            <button
              disabled={inputRoomId.length !== 4}
              onClick={() => handleJoinRoom(inputRoomId)}
              className={`px-4 py-2 rounded-lg font-bold text-sm tracking-wide transition-all ${inputRoomId.length === 4 ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}>
              参加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
