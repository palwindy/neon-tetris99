
// services/multiplayerService.ts
import { MultiPlayer } from '../types';

const CHANNEL_NAME = 'neon-tetris-multi';
const STORAGE_KEY = 'neon-tetris-room';
const HEARTBEAT_INTERVAL = 1500; // ms
const PLAYER_TIMEOUT = 4000; // ms

export type RoomEventCallback = (players: MultiPlayer[]) => void;

class MultiplayerService {
  private channel: BroadcastChannel;
  private playerId: string;
  private playerName: string;
  private roomId: string;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private onPlayersChange: RoomEventCallback | null = null;
  private players: Map<string, { player: MultiPlayer; lastSeen: number }> = new Map();

  constructor() {
    this.channel = new BroadcastChannel(CHANNEL_NAME);
    this.playerId = `player_${Math.random().toString(36).slice(2, 8)}`;
    this.playerName = `Player_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    this.roomId = this.detectRoomId();
    this.channel.onmessage = this.handleMessage.bind(this);
    window.addEventListener('storage', this.handleStorage.bind(this));
  }

  private detectRoomId(): string {
    const stored = localStorage.getItem(`${STORAGE_KEY}_roomId`);
    if (stored && /^\d{4}$/.test(stored)) return stored;
    const newId = String(Math.floor(1000 + Math.random() * 9000)); // 1000〜9999
    localStorage.setItem(`${STORAGE_KEY}_roomId`, newId);
    return newId;
  }

  joinRoom(roomId: string, onPlayersChange: RoomEventCallback) {
    this.roomId = roomId;
    this.onPlayersChange = onPlayersChange;
    localStorage.setItem(`${STORAGE_KEY}_roomId`, roomId);
    this.startHeartbeat();
    this.broadcast('JOIN');
  }

  setReady() {
    this.broadcast('READY');
  }

  leaveRoom() {
    this.broadcast('LEAVE');
    this.stopHeartbeat();
    this.players.clear();
    localStorage.removeItem(`${STORAGE_KEY}_roomId`);
  }

  getRoomId() { return this.roomId; }
  getPlayerId() { return this.playerId; }
  getPlayerName() { return this.playerName; }

  private broadcast(type: 'JOIN' | 'HEARTBEAT' | 'READY' | 'LEAVE') {
    const payload = {
      type,
      roomId: this.roomId,
      player: {
        id: this.playerId,
        name: this.playerName,
        status: type === 'READY' ? 'ready' : (type === 'LEAVE' ? 'searching' : 'found'),
        isHost: false,
      } as MultiPlayer,
    };
    this.channel.postMessage(payload);
    localStorage.setItem(`${STORAGE_KEY}_${this.playerId}`, JSON.stringify({ ...payload, ts: Date.now() }));
  }

  private handleMessage(event: MessageEvent) {
    this.processEvent(event.data);
  }

  private handleStorage(event: StorageEvent) {
    if (event.key?.startsWith(`${STORAGE_KEY}_player_`)) {
      try {
        const data = JSON.parse(event.newValue || '');
        this.processEvent(data);
      } catch {}
    }
  }

  private processEvent(data: any) {
    if (!data || data.roomId !== this.roomId || data.player.id === this.playerId) return;
    if (data.type === 'LEAVE') {
      this.players.delete(data.player.id);
    } else {
      this.players.set(data.player.id, { player: data.player, lastSeen: Date.now() });
    }
    this.cleanupStale();
    this.onPlayersChange?.(this.getAllPlayers());
  }

  private cleanupStale() {
    const now = Date.now();
    for (const [id, { lastSeen }] of this.players) {
      if (now - lastSeen > PLAYER_TIMEOUT) this.players.delete(id);
    }
  }

  getAllPlayers(): MultiPlayer[] {
    const self: MultiPlayer = {
      id: this.playerId,
      name: this.playerName,
      status: 'found',
      isHost: this.players.size === 0,
    };
    return [self, ...Array.from(this.players.values()).map(v => v.player)];
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.broadcast('HEARTBEAT');
      this.cleanupStale();
      this.onPlayersChange?.(this.getAllPlayers());
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
  }
}

export const multiplayerService = new MultiplayerService();
