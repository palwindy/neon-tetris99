import { MultiPlayer, MultiPlayerStatus, RoomConfig, SlotConfig } from '../types';
import { db } from '../firebase';
import {
  ref,
  onValue,
  set,
  update,
  onDisconnect,
  remove,
  get,
  Unsubscribe,
  runTransaction,
} from 'firebase/database';

const STORAGE_KEY = 'neon-tetris-room';

export type RoomEventCallback = (players: MultiPlayer[]) => void;
export type RoomConfigCallback = (config: RoomConfig | null) => void;

class MultiplayerService {
  private playerId: string;
  private playerName: string;
  private roomId: string = '';
  private listeners: Set<RoomEventCallback> = new Set();
  private configListeners: Set<RoomConfigCallback> = new Set();
  private unsubscribePlayers: Unsubscribe | null = null;
  private unsubscribeConfig: Unsubscribe | null = null;
  private currentPlayers: MultiPlayer[] = [];
  private currentConfig: RoomConfig | null = null;
  private lastStatus: MultiPlayerStatus | null = null;

  constructor() {
    this.playerId = this.getOrCreatePlayerId();
    this.playerName = this.getOrCreatePlayerName();
  }

  private getOrCreatePlayerId(): string {
    let id = localStorage.getItem(`${STORAGE_KEY}_playerId`);
    if (!id) {
      id = `p_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(`${STORAGE_KEY}_playerId`, id);
    }
    return id;
  }

  private getOrCreatePlayerName(): string {
    let name = localStorage.getItem(`${STORAGE_KEY}_playerName`);
    if (!name) {
      name = `Player_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      localStorage.setItem(`${STORAGE_KEY}_playerName`, name);
    }
    return name;
  }

  getRoomId() {
    const stored = localStorage.getItem(`${STORAGE_KEY}_roomId`);
    if (stored && /^\d{4}$/.test(stored)) return stored;
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  getPlayerId() { return this.playerId; }
  getPlayerName() { return this.playerName; }
  getCurrentPlayers() { return this.currentPlayers; }
  getCurrentConfig() { return this.currentConfig; }

  addListener(cb: RoomEventCallback) {
    this.listeners.add(cb);
    if (this.currentPlayers.length > 0) cb(this.currentPlayers);
  }
  removeListener(cb: RoomEventCallback) { this.listeners.delete(cb); }

  addConfigListener(cb: RoomConfigCallback) {
    this.configListeners.add(cb);
    if (this.currentConfig) cb(this.currentConfig);
  }
  removeConfigListener(cb: RoomConfigCallback) { this.configListeners.delete(cb); }

  private notify(players: MultiPlayer[]) {
    this.currentPlayers = players;
    this.listeners.forEach(cb => cb(players));
  }

  private notifyConfig(config: RoomConfig | null) {
    this.currentConfig = config;
    this.configListeners.forEach(cb => cb(config));
  }

  /**
   * ルーム作成 or 参加。
   * - hostSlots を渡した場合：自分がホストとして config 付きでルームを作成。CPU プレイヤーも書き込む
   * - hostSlots を渡さない場合：既存ルームに HUMAN プレイヤーとして参加
   */
  async joinRoom(roomId: string, hostSlots?: SlotConfig[]) {
    this.roomId = roomId;
    this.lastStatus = null;
    localStorage.setItem(`${STORAGE_KEY}_roomId`, roomId);

    const roomRef = ref(db, `rooms/${roomId}`);
    const playerRef = ref(db, `rooms/${roomId}/players/${this.playerId}`);
    const configRef = ref(db, `rooms/${roomId}/config`);

    if (hostSlots) {
      // ホストとして「部屋を作る」: 既存部屋（CPU 残骸・古い config 含む）を完全削除してから再構築
      await remove(roomRef);
      const slots: SlotConfig[] = hostSlots;
      const config: RoomConfig = { hostId: this.playerId, slots };
      await set(configRef, config);

      const me: MultiPlayer = {
        id: this.playerId,
        name: this.playerName,
        status: 'found',
        isHost: true,
        pendingGarbage: 0,
        slotIndex: 0,
        isCpu: false,
      };
      await set(playerRef, me);

      // CPU プレイヤーを書き込む（必要枠数のみ）
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        if (s.kind === 'CPU') {
          const cpuId = `cpu_${i + 1}`;
          const lvl = s.cpuLevel ?? 3;
          const cpu: MultiPlayer = {
            id: cpuId,
            name: `CPU LV.${lvl}`,
            status: 'ready',
            isHost: false,
            pendingGarbage: 0,
            slotIndex: i + 1,
            isCpu: true,
            cpuLevel: lvl,
            matrix: '',
          };
          await set(ref(db, `rooms/${roomId}/players/${cpuId}`), cpu);
        }
      }
    } else {
      // ゲストとして既存ルームに参加
      const snap = await get(roomRef);
      if (!snap.exists()) {
        console.warn(`[MultiplayerService] join: room ${roomId} does not exist`);
        return;
      }
      const me: MultiPlayer = {
        id: this.playerId,
        name: this.playerName,
        status: 'found',
        isHost: false,
        pendingGarbage: 0,
        isCpu: false,
      };
      await set(playerRef, me);
    }

    onDisconnect(playerRef).remove();
    this.subscribeRoom(roomId);
  }

  private subscribeRoom(roomId: string) {
    if (this.unsubscribePlayers) this.unsubscribePlayers();
    if (this.unsubscribeConfig) this.unsubscribeConfig();

    const playersRef = ref(db, `rooms/${roomId}/players`);
    const configRef = ref(db, `rooms/${roomId}/config`);

    this.unsubscribeConfig = onValue(configRef, snap => {
      this.notifyConfig(snap.exists() ? (snap.val() as RoomConfig) : null);
    });

    this.unsubscribePlayers = onValue(playersRef, snap => {
      if (!snap.exists()) {
        this.notify([]);
        return;
      }
      const list = Object.values(snap.val() as Record<string, MultiPlayer>);
      this.notify(list);
    });
  }

  setReady() { this.updateStatus('ready'); }

  updateStatus(status: MultiPlayerStatus) {
    if (!this.roomId) return;
    if (this.lastStatus === status) return;
    this.lastStatus = status;
    update(ref(db, `rooms/${this.roomId}/players/${this.playerId}`), { status });
  }

  async sendMatrix(grid: import('../types').Grid) {
    if (!this.roomId) return;
    let s = '';
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) s += grid[y][x].filled ? '1' : '0';
    }
    try {
      await update(ref(db, `rooms/${this.roomId}/players/${this.playerId}`), { matrix: s });
    } catch (e) { console.error('[MultiplayerService] sendMatrix failed:', e); }
  }

  /**
   * 自分（または fromId 指定）が攻撃を出す。生存している自分以外の全プレイヤーに同じ火力を送る
   */
  async sendAttack(lines: number, fromId?: string) {
    if (!this.roomId || lines <= 0) return;
    const senderId = fromId ?? this.playerId;
    try {
      const snap = await get(ref(db, `rooms/${this.roomId}/players`));
      if (!snap.exists()) return;
      const players = snap.val() as Record<string, MultiPlayer>;
      const targets = Object.values(players).filter(
        p => p.id !== senderId && p.status !== 'defeated'
      );
      await Promise.all(
        targets.map(t =>
          runTransaction(
            ref(db, `rooms/${this.roomId}/players/${t.id}/pendingGarbage`),
            (cur) => (cur || 0) + lines
          )
        )
      );
      console.log(`[MultiplayerService] attack ${lines} from ${senderId} -> ${targets.length} targets`);
    } catch (e) { console.error('[MultiplayerService] sendAttack failed:', e); }
  }

  async resetPendingGarbageFor(playerId: string) {
    if (!this.roomId) return;
    await update(ref(db, `rooms/${this.roomId}/players/${playerId}`), { pendingGarbage: 0 });
  }

  async resetPendingGarbage() {
    return this.resetPendingGarbageFor(this.playerId);
  }

  /** ホストが CPU プレイヤーの状態を書き込む */
  async updateCpuPlayer(cpuId: string, fields: Partial<MultiPlayer>) {
    if (!this.roomId) return;
    try {
      await update(ref(db, `rooms/${this.roomId}/players/${cpuId}`), fields);
    } catch (e) { console.error('[MultiplayerService] updateCpuPlayer failed:', e); }
  }

  async leaveRoom() {
    if (this.unsubscribePlayers) { this.unsubscribePlayers(); this.unsubscribePlayers = null; }
    if (this.unsubscribeConfig) { this.unsubscribeConfig(); this.unsubscribeConfig = null; }
    if (this.roomId) {
      const playerRef = ref(db, `rooms/${this.roomId}/players/${this.playerId}`);
      await remove(playerRef);
      // ホストが抜けた場合、ルームを掃除（CPU 含めて全削除）
      const me = this.currentPlayers.find(p => p.id === this.playerId);
      if (me?.isHost) {
        await remove(ref(db, `rooms/${this.roomId}`));
      } else {
        const snap = await get(ref(db, `rooms/${this.roomId}/players`));
        if (!snap.exists()) {
          await remove(ref(db, `rooms/${this.roomId}`));
        }
      }
    }
    this.roomId = '';
    this.lastStatus = null;
    this.notify([]);
    this.notifyConfig(null);
  }
}

export const multiplayerService = new MultiplayerService();
