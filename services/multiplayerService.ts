import { MultiPlayer, MultiPlayerStatus } from '../types';
import { db } from '../firebase';
import { 
  ref, 
  onValue, 
  set, 
  update, 
  onDisconnect, 
  remove, 
  serverTimestamp, 
  get,
  Unsubscribe,
  runTransaction
} from 'firebase/database';

const STORAGE_KEY = 'neon-tetris-room';

export type RoomEventCallback = (players: MultiPlayer[]) => void;

class MultiplayerService {
  private playerId: string;
  private playerName: string;
  private roomId: string = '';
  private listeners: Set<RoomEventCallback> = new Set();
  private unsubscribe: Unsubscribe | null = null;
  private currentPlayers: MultiPlayer[] = [];
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

  addListener(cb: RoomEventCallback) {
    this.listeners.add(cb);
    if (this.currentPlayers.length > 0) cb(this.currentPlayers);
  }

  removeListener(cb: RoomEventCallback) {
    this.listeners.delete(cb);
  }

  private notify(players: MultiPlayer[]) {
    console.log("[MultiplayerService] notify players:", players);
    this.currentPlayers = players;
    this.listeners.forEach(cb => cb(players));
  }

  async joinRoom(roomId: string, onPlayersChange?: RoomEventCallback) {
    this.roomId = roomId;
    if (onPlayersChange) this.addListener(onPlayersChange);

    localStorage.setItem(`${STORAGE_KEY}_roomId`, roomId);

    const playerRef = ref(db, `rooms/${roomId}/players/${this.playerId}`);
    const roomPlayersRef = ref(db, `rooms/${roomId}/players`);

    const initialData: MultiPlayer = {
      id: this.playerId,
      name: this.playerName,
      status: 'found',
      isHost: false,
      pendingGarbage: 0
    };

    onDisconnect(playerRef).remove();

    if (this.unsubscribe) this.unsubscribe();
    this.unsubscribe = onValue(roomPlayersRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        set(playerRef, { ...initialData, isHost: true });
        return;
      }

      const playersObj = data as Record<string, MultiPlayer>;
      const playersList = Object.values(playersObj);
      
      const hasHost = playersList.some(p => p.isHost);
      if (!hasHost) {
        const isMeOnly = playersList.length === 1 && playersList[0].id === this.playerId;
        if (isMeOnly) {
          update(playerRef, { isHost: true });
        }
      }

      if (!playersObj[this.playerId]) {
        set(playerRef, initialData);
      }

      this.notify(playersList);
    });
  }

  setReady() {
    this.updateStatus('ready');
  }

  updateStatus(status: MultiPlayerStatus) {
    if (!this.roomId) return;
    if (this.lastStatus === status) return;

    console.log(`[MultiplayerService] updateStatus: ${this.lastStatus} -> ${status} for roomId: ${this.roomId}`);
    this.lastStatus = status;
    
    const playerRef = ref(db, `rooms/${this.roomId}/players/${this.playerId}`);
    update(playerRef, { status });
  }

  async sendAttack(lines: number) {
    if (!this.roomId || lines <= 0) return;
    const playersRef = ref(db, `rooms/${this.roomId}/players`);
    
    try {
      const snapshot = await get(playersRef);
      if (!snapshot.exists()) return;
      
      const players = snapshot.val();
      const opponentId = Object.keys(players).find(id => id !== this.playerId);
      
      if (opponentId) {
        const opponentGarbageRef = ref(db, `rooms/${this.roomId}/players/${opponentId}/pendingGarbage`);
        await runTransaction(opponentGarbageRef, (currentValue) => {
          return (currentValue || 0) + lines;
        });
        console.log(`[MultiplayerService] Sent ${lines} lines of garbage to ${opponentId}`);
      }
    } catch (e) {
      console.error("[MultiplayerService] sendAttack failed:", e);
    }
  }

  async resetPendingGarbage() {
    if (!this.roomId) return;
    const playerRef = ref(db, `rooms/${this.roomId}/players/${this.playerId}`);
    await update(playerRef, { pendingGarbage: 0 });
  }

  async leaveRoom() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.roomId) {
      const playerRef = ref(db, `rooms/${this.roomId}/players/${this.playerId}`);
      await remove(playerRef);
      const roomPlayersRef = ref(db, `rooms/${this.roomId}/players`);
      const snapshot = await get(roomPlayersRef);
      if (!snapshot.exists()) {
        await remove(ref(db, `rooms/${this.roomId}`));
      }
    }
    this.roomId = '';
    this.notify([]);
  }
}

export const multiplayerService = new MultiplayerService();
