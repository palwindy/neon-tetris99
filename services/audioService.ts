// v1.23: 音声機能を一時的に完全無効化 (スマホ環境フリーズ対策)
// すべてのメソッドはno-op（何もしない）として定義し、例外を一切出さない。

class AudioService {
  // --- ダミー状態プロパティ ---
  private bgmEnabled: boolean = true;
  private seEnabled:  boolean = true;

  // BGM/SE設定（UIとの互換性維持のため残す）
  setBgmEnabled(on: boolean) { this.bgmEnabled = on; }
  setSeEnabled(on: boolean)  { this.seEnabled  = on; }
  getBgmEnabled(): boolean   { return this.bgmEnabled; }
  getSeEnabled(): boolean    { return this.seEnabled; }
  getBgmIsPaused(): boolean  { return false; }

  // --- 初期化・BGM・SE は全てno-op ---
  async init(): Promise<void>       {}
  startBGM(_mode: 'title' | 'game') {}
  pauseBGM()                        {}
  resumeBGM()                       {}
  stopBGM()                         {}
  stopAll()                          {}

  setDangerLevel(_ratio: number)     {}

  playMove()                        {}
  playRotate()                      {}
  playLock()                        {}
  playLockHeavy()                   {}
  playHardDrop()                    {}
  playLineClear(_lines: number)     {}
  playTSpin()                       {}
  playAllClear()                    {}
  playPause()                       {}
  playCombo(_combo: number)         {}
  playGameOver()                    {}
}

export const audioService = new AudioService();
