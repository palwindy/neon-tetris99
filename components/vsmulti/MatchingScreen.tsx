import React, { useState, useEffect, useMemo } from 'react';
import { X, Settings, Bot, User } from 'lucide-react';
import { audioService } from '../../services/audioService';
import { multiplayerService } from '../../services/multiplayerService';
import { MultiPlayer, SlotConfig, RoomConfig } from '../../types';

interface MatchingScreenProps {
  onGameStart: (roomId: string, players: MultiPlayer[]) => void;
  onBack: () => void;
  onOpenSettings: () => void;
}

type Mode = 'host' | 'guest';

export const MatchingScreen: React.FC<MatchingScreenProps> = ({ onGameStart, onBack, onOpenSettings }) => {
  const handleBack = () => {
    audioService.playCancel();
    multiplayerService.leaveRoom();
    onBack();
  };

  const myId = useMemo(() => multiplayerService.getPlayerId(), []);
  const myName = useMemo(() => multiplayerService.getPlayerName(), []);
  const initialRoomId = useMemo(() => multiplayerService.getRoomId(), []);

  const [mode, setMode] = useState<Mode>('host');
  const [roomId, setRoomId] = useState<string>(initialRoomId);
  const [inputRoomId, setInputRoomId] = useState('');
  const [copied, setCopied] = useState(false);
  const [joined, setJoined] = useState(false);

  const [players, setPlayers] = useState<MultiPlayer[]>([]);
  const [config, setConfig] = useState<RoomConfig | null>(null);

  // ホスト設定（部屋を作るときの設定）
  const [hostRoomSize, setHostRoomSize] = useState<2 | 3>(2);
  const [hostSlot1, setHostSlot1] = useState<SlotConfig>({ kind: 'HUMAN' });
  const [hostSlot2, setHostSlot2] = useState<SlotConfig>({ kind: 'CPU', cpuLevel: 3 });

  useEffect(() => {
    multiplayerService.addListener(setPlayers);
    multiplayerService.addConfigListener(setConfig);
    return () => {
      multiplayerService.removeListener(setPlayers);
      multiplayerService.removeConfigListener(setConfig);
    };
  }, []);

  const me = players.find(p => p.id === myId);
  const myStatus = me?.status;
  const humanPlayers = players.filter(p => !p.isCpu);

  // 全 HUMAN 参加者が ready で、必要人数が揃ったら開始
  useEffect(() => {
    if (!joined || !config) return;
    const expectedHumans = 1 + config.slots.filter(s => s.kind === 'HUMAN').length;
    const readyHumans = humanPlayers.filter(p => p.status === 'ready').length;
    if (humanPlayers.length >= expectedHumans && readyHumans >= expectedHumans) {
      console.log('[Matching] all humans ready, starting game');
      onGameStart(roomId, players);
    }
  }, [players, joined, config, humanPlayers, roomId, onGameStart]);

  const buildHostSlots = (): SlotConfig[] => {
    const slots: SlotConfig[] = [hostSlot1];
    if (hostRoomSize === 3) slots.push(hostSlot2);
    return slots;
  };

  const handleCreate = async () => {
    audioService.playOk();
    // 他人が使用中のルーム ID と衝突しないよう、毎回 Firebase 上で未使用の 4 桁を発行
    const freshId = await multiplayerService.generateUniqueRoomId();
    setRoomId(freshId);
    await multiplayerService.joinRoom(freshId, buildHostSlots());
    setJoined(true);
  };

  const handleJoin = async () => {
    if (inputRoomId.length !== 4) return;
    audioService.playOk();
    setRoomId(inputRoomId);
    await multiplayerService.joinRoom(inputRoomId);
    setJoined(true);
  };

  const handleReady = () => {
    audioService.playOk();
    multiplayerService.setReady();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleResetRoom = async () => {
    await multiplayerService.leaveRoom();
    setJoined(false);
    setConfig(null);
    setPlayers([]);
  };

  // 表示用の枠リスト（ホスト=index 0、相手枠=index 1..N）
  const slotsView = useMemo(() => {
    if (joined && config) {
      return [{ kind: 'HUMAN' as const, slotIndex: 0, isHost: true }, ...config.slots.map((s, i) => ({ ...s, slotIndex: i + 1, isHost: false }))];
    }
    const previewSlots: SlotConfig[] = mode === 'host' ? buildHostSlots() : [];
    return [{ kind: 'HUMAN' as const, slotIndex: 0, isHost: true }, ...previewSlots.map((s, i) => ({ ...s, slotIndex: i + 1, isHost: false }))];
  }, [joined, config, mode, hostRoomSize, hostSlot1, hostSlot2]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(5,5,20,0.85)', backdropFilter: 'blur(18px) saturate(1.4)' }}>

      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button onClick={handleBack} className="p-1 text-gray-400 hover:text-white active:scale-95">
          <X size={24} />
        </button>
        <h1 className="text-xl font-black tracking-widest"
          style={{ color: '#e040fb', textShadow: '0 0 12px #e040fb,0 0 24px #7c4dff' }}>
          VS MULTI
        </h1>
        <button onClick={onOpenSettings}
          className="p-2 rounded-lg border border-gray-700 bg-gray-800/60 text-gray-400 hover:text-white active:scale-95">
          <Settings size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3">
        {!joined && (
          <div className="flex gap-2">
            <button onClick={() => setMode('host')}
              className={`flex-1 py-2 rounded-lg font-bold text-sm tracking-wider transition-all ${mode === 'host' ? 'bg-purple-600 text-white shadow-[0_0_10px_#a855f7]' : 'bg-gray-800 text-gray-400'}`}>
              部屋を作る
            </button>
            <button onClick={() => setMode('guest')}
              className={`flex-1 py-2 rounded-lg font-bold text-sm tracking-wider transition-all ${mode === 'guest' ? 'bg-cyan-600 text-white shadow-[0_0_10px_#06b6d4]' : 'bg-gray-800 text-gray-400'}`}>
              部屋に参加
            </button>
          </div>
        )}

        <div className="rounded-xl border border-purple-500/40 bg-black/40 p-3 text-center">
          <p className="text-xs text-gray-400 mb-1 tracking-widest">ROOM ID</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl font-black tracking-[0.3em]"
              style={{ color: '#e040fb', textShadow: '0 0 16px #e040fb' }}>
              {roomId}
            </span>
            <button onClick={handleCopy}
              className="text-xs px-2 py-1 rounded border border-purple-400/50 text-purple-300 hover:bg-purple-900/40">
              {copied ? '✓' : 'コピー'}
            </button>
          </div>
        </div>

        {!joined && mode === 'host' && (
          <div className="rounded-xl border border-purple-500/40 bg-black/40 p-3 flex flex-col gap-3">
            <div>
              <p className="text-[11px] text-purple-300 font-bold tracking-widest mb-2">ROOM SIZE</p>
              <div className="grid grid-cols-2 gap-2">
                {[2, 3].map(size => (
                  <button key={size} onClick={() => { setHostRoomSize(size as 2 | 3); audioService.playOk(); }}
                    className={`py-2 rounded font-bold text-sm border transition-all ${hostRoomSize === size ? 'bg-purple-600 text-white border-purple-300 shadow-[0_0_8px_#a855f7]' : 'bg-transparent text-purple-200 border-purple-500/40'}`}>
                    {size}人対戦
                  </button>
                ))}
              </div>
            </div>
            <SlotPicker label="OPPONENT 1" value={hostSlot1} onChange={setHostSlot1} />
            {hostRoomSize === 3 && (
              <SlotPicker label="OPPONENT 2" value={hostSlot2} onChange={setHostSlot2} />
            )}
            <button onClick={handleCreate}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black tracking-widest shadow-[0_0_16px_#a855f7]">
              この設定で部屋を作る
            </button>
          </div>
        )}

        {!joined && mode === 'guest' && (
          <div className="rounded-xl border border-cyan-500/40 bg-black/40 p-3">
            <p className="text-xs text-cyan-200 mb-2 tracking-widest text-center">参加するROOM ID</p>
            <div className="flex gap-2">
              <input type="text" inputMode="numeric" pattern="\d{4}" maxLength={4} placeholder="0000"
                value={inputRoomId}
                onChange={e => setInputRoomId(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="flex-1 bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-white text-center text-xl tracking-[0.3em] font-bold focus:border-cyan-400 outline-none" />
              <button disabled={inputRoomId.length !== 4} onClick={handleJoin}
                className={`px-4 py-2 rounded-lg font-bold text-sm tracking-wide ${inputRoomId.length === 4 ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-gray-800 text-gray-600'}`}>
                参加
              </button>
            </div>
          </div>
        )}

        {/* 参加プレイヤー枠 (JOIN 後の WAITING ROOM) */}
        <div className="flex flex-col gap-2">
          {slotsView.map(slot => {
            const playerForSlot = players.find(p => p.slotIndex === slot.slotIndex);
            return (
              <SlotCard key={slot.slotIndex}
                slot={slot}
                player={playerForSlot}
                isMe={playerForSlot?.id === myId}
                myName={myName}
              />
            );
          })}
        </div>

        {joined && (
          <div className="flex flex-col gap-2">
            <button onClick={handleReady}
              disabled={myStatus === 'ready'}
              className={`w-full py-3 rounded-xl font-black text-base tracking-widest transition-all ${myStatus === 'ready' ? 'bg-green-700 text-green-200' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_12px_#a855f7]'}`}>
              {myStatus === 'ready' ? '✓ 準備完了！相手を待機中' : '準備完了'}
            </button>
            <button onClick={handleResetRoom}
              className="w-full py-2 rounded-lg text-gray-400 text-xs hover:text-white border border-gray-700">
              部屋を抜ける
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface SlotPickerProps {
  label: string;
  value: SlotConfig;
  onChange: (s: SlotConfig) => void;
}

const SlotPicker: React.FC<SlotPickerProps> = ({ label, value, onChange }) => {
  const isCpu = value.kind === 'CPU';
  return (
    <div>
      <p className="text-[11px] text-cyan-300 font-bold tracking-widest mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <button onClick={() => onChange({ kind: 'HUMAN' })}
          className={`py-2 rounded font-bold text-sm border flex items-center justify-center gap-1 transition-all ${!isCpu ? 'bg-cyan-600 text-white border-cyan-300 shadow-[0_0_8px_#06b6d4]' : 'bg-transparent text-cyan-200 border-cyan-500/40'}`}>
          <User size={14} /> HUMAN
        </button>
        <button onClick={() => onChange({ kind: 'CPU', cpuLevel: value.cpuLevel ?? 3 })}
          className={`py-2 rounded font-bold text-sm border flex items-center justify-center gap-1 transition-all ${isCpu ? 'bg-cyan-600 text-white border-cyan-300 shadow-[0_0_8px_#06b6d4]' : 'bg-transparent text-cyan-200 border-cyan-500/40'}`}>
          <Bot size={14} /> CPU
        </button>
      </div>
      {isCpu && (
        <div className="grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5].map(lv => {
            const sel = value.cpuLevel === lv;
            return (
              <button key={lv} onClick={() => onChange({ kind: 'CPU', cpuLevel: lv })}
                className={`py-1.5 rounded font-bold text-xs border transition-all ${sel ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_6px_#06b6d4]' : 'bg-transparent text-cyan-300 border-cyan-500/40'}`}>
                Lv{lv}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface SlotCardProps {
  slot: { kind: 'HUMAN' | 'CPU'; slotIndex: number; isHost?: boolean; cpuLevel?: number };
  player: MultiPlayer | undefined;
  isMe: boolean;
  myName: string;
}

const SlotCard: React.FC<SlotCardProps> = ({ slot, player, isMe, myName }) => {
  const isHost = slot.slotIndex === 0;
  const isCpu = slot.kind === 'CPU';
  const ready = player?.status === 'ready';
  const label = isHost ? 'HOST (YOU)' : isMe ? 'YOU' : `OPPONENT ${slot.slotIndex}`;
  const name = isMe ? myName : (player?.name ?? (isCpu ? `CPU LV.${slot.cpuLevel ?? 3}` : '待機中…'));

  return (
    <div className={`rounded-xl border p-3 flex items-center justify-between transition-all ${ready ? 'border-green-400 shadow-[0_0_10px_#4ade80]' : isCpu ? 'border-cyan-500/50' : 'border-purple-500/50'} bg-black/40`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCpu ? 'bg-cyan-900/50 text-cyan-300' : 'bg-purple-900/50 text-purple-200'}`}>
          {isCpu ? <Bot size={20} /> : <User size={20} />}
        </div>
        <div>
          <p className="text-[10px] tracking-widest text-gray-400 font-bold">{label}</p>
          <p className="text-sm font-bold text-white truncate max-w-[180px]">{name}</p>
        </div>
      </div>
      <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full ${isCpu ? 'bg-cyan-500/30 text-cyan-200' : ready ? 'bg-green-500/30 text-green-200' : player ? 'bg-purple-500/30 text-purple-200' : 'bg-gray-700 text-gray-500'}`}>
        {isCpu ? 'CPU' : ready ? '✓ READY' : player ? 'JOINED' : 'WAITING'}
      </span>
    </div>
  );
};
