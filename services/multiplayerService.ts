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
  Unsubscribe
} from 'firebase/database';

const STORAGE_KEY = 'neon-tetris-room';

export type RoomEventCallback = (players: MultiPlayer[]) => void;

class MultiplayerService {
  private playerId: string;
  private playerName: string;
  private roomId: string = '';
  private onPlayersChange: RoomEventCallback | null = null;
  private unsubscribe: Unsubscribe | null = null;

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

  async joinRoom(roomId: string, onPlayersChange: RoomEventCallback) {
    this.roomId = roomId;
    this.onPlayersChange = onPlayersChange;
    localStorage.setItem(`${STORAGE_KEY}_roomId`, roomId);

    const playerRef = ref(db, `rooms/${roomId}/players/${this.playerId}`);
    const roomPlayersRef = ref(db, `rooms/${roomId}/players`);

    // 自分の情報を登録
    const initialData: MultiPlayer = {
      id: this.playerId,
      name: this.playerName,
      status: 'found',
      isHost: false // 最初の参加者が後で判定
    };

    // 切断時に自動削除
    onDisconnect(playerRef).remove();

    // 部屋の状態を監視
    if (this.unsubscribe) this.unsubscribe();
    this.unsubscribe = onValue(roomPlayersRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        // 自分が最初のプレイヤー
        set(playerRef, { ...initialData, isHost: true });
        this.onPlayersChange?.([{ ...initialData, isHost: true }]);
        return;
      }

      const playersObj = data as Record<string, MultiPlayer>;
      const playersList = Object.values(playersObj);
      
      // ホスト不在チェック (誰かがホストであるべき)
      const hasHost = playersList.some(p => p.isHost);
      if (!hasHost) {
        // 最古のプレイヤー（または自分）をホストにする簡易ロジック
        // ここでは自分しかいなければ自分をホストにする
        const isMeOnly = playersList.length === 1 && playersList[0].id === this.playerId;
        if (isMeOnly) {
          update(playerRef, { isHost: true });
        }
      }

      // 自分がリストにいなければ追加
      if (!playersObj[this.playerId]) {
        set(playerRef, initialData);
      }

      this.onPlayersChange?.(playersList);
    });
  }

  setReady() {
    if (!this.roomId) return;
    const playerRef = ref(db, `rooms/${this.roomId}/players/${this.playerId}`);
    update(playerRef, { status: 'ready' as MultiPlayerStatus });
  }

  async leaveRoom() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.roomId) {
      const playerRef = ref(db, `rooms/${this.roomId}/players/${this.playerId}`);
      await remove(playerRef);
      // もし自分が最後のプレイヤーなら部屋ごと消す（任意）
      const roomPlayersRef = ref(db, `rooms/${this.roomId}/players`);
      const snapshot = await get(roomPlayersRef);
      if (!snapshot.exists()) {
        await remove(ref(db, `rooms/${this.roomId}`));
      }
    }
    this.roomId = '';
    this.onPlayersChange = null;
  }
}

export const multiplayerService = new MultiplayerService();
