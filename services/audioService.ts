// v1.24: スマホ安全版 AudioService
// ルール
//   1. playSE / startBGM は初期化完了前なら黙ってスキップ（init()の再呼び出し禁止）
//   2. 全ての非同期処理は try-catch で囲み、例外をゲームへ伝播させない
//   3. decodeAudioData はコールバック・Promise 両方に対応した安全ラッパーで呼ぶ
//   4. AudioContext の状態は常に確認してから操作する

class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private seGain: GainNode | null = null;

  private bgmEnabled: boolean = true;
  private seEnabled: boolean = true;

  private currentBgmSource: AudioBufferSourceNode | null = null;
  private currentBgmKey: string | null = null;
  private bgmPausedOffset: number = 0;
  private bgmStartedAt: number = 0;
  private bgmIsPaused: boolean = false;

  private activeSESources: Set<AudioBufferSourceNode> = new Set();

  private buffers: Record<string, AudioBuffer> = {};
  // READY になって初めて SE / BGM を再生できる
  private state: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
  private pendingBGM: 'title' | 'game' | null = null;

  private readonly ASSETS: Record<string, string> = {
    bgm_title:   '/assets/bgm_title.mp3',
    bgm_game:    '/assets/bgm_game.mp3',
    se_move:     '/assets/se_move.mp3',
    se_rotate:   '/assets/se_rotate.mp3',
    se_drop:     '/assets/se_drop.mp3',
    se_lock:     '/assets/se_lock.mp3',
    se_clear:    '/assets/se_clear.mp3',
    se_tspin:    '/assets/se_tspin.mp3',
    se_gameover: '/assets/se_gameover.mp3',
  };

  // ユーザー操作後に一度だけ呼ぶ
  async init(): Promise<void> {
    if (this.state === 'loading' || this.state === 'ready') return;
    this.state = 'loading';
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) { this.state = 'error'; return; }

      this.ctx = new AudioCtx();
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume().catch(() => {});
      }

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.5;
      this.bgmGain.connect(this.masterGain);

      this.seGain = this.ctx.createGain();
      this.seGain.gain.value = 0.8;
      this.seGain.connect(this.masterGain);

      await this.loadAllAssets();
      this.state = 'ready';

      // ロード完了後に pending BGM があれば再生
      if (this.pendingBGM) {
        const pending = this.pendingBGM;
        this.pendingBGM = null;
        this.startBGM(pending);
      }
    } catch (e) {
      console.warn('[AudioService] init failed:', e);
      this.state = 'error';
    }
  }

  // iOS 旧仕様対応: decodeAudioData をコールバック・Promise 両対応のラッパーで呼ぶ
  private decodeAudioDataSafe(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      if (!this.ctx) { reject(new Error('no ctx')); return; }
      try {
        const result = this.ctx.decodeAudioData(
          arrayBuffer,
          (decoded) => resolve(decoded),
          (err) => reject(err),
        );
        // Promise を返す環境では catch をチェーンして未処理拒否を防ぐ
        if (result && typeof (result as any).then === 'function') {
          (result as Promise<AudioBuffer>).then(resolve).catch(reject);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  private async loadAllAssets(): Promise<void> {
    if (!this.ctx) return;
    const promises = Object.entries(this.ASSETS).map(async ([key, url]) => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        this.buffers[key] = await this.decodeAudioDataSafe(arrayBuffer);
      } catch (e) {
        console.warn(`[AudioService] load skipped: ${key}`, e);
      }
    });
    await Promise.all(promises);
  }

  // --- 設定 ---
  setBgmEnabled(on: boolean) {
    this.bgmEnabled = on;
    if (!on) this.pauseBGM(); else this.resumeBGM();
  }
  setSeEnabled(on: boolean) {
    this.seEnabled = on;
    if (!on) {
      this.activeSESources.forEach(src => {
        try { src.stop(0); } catch (_) {}
        try { src.disconnect(); } catch (_) {}
      });
      this.activeSESources.clear();
    }
  }
  getBgmEnabled(): boolean  { return this.bgmEnabled; }
  getSeEnabled(): boolean   { return this.seEnabled; }
  getBgmIsPaused(): boolean { return this.bgmIsPaused; }

  // --- BGM ---
  startBGM(mode: 'title' | 'game') {
    if (!this.bgmEnabled) return;
    if (this.state !== 'ready') {
      // まだ準備中なら pending に積むだけ（init の再帰呼び出しは絶対しない）
      this.pendingBGM = mode;
      return;
    }
    if (this.currentBgmKey === mode && this.currentBgmSource && !this.bgmIsPaused) return;
    if (this.currentBgmKey !== mode) this.stopBGM();
    this.currentBgmKey = mode;
    const bufferKey = mode === 'title' ? 'bgm_title' : 'bgm_game';
    const buffer = this.buffers[bufferKey];
    if (buffer) {
      this._playBGMBuffer(buffer, 0);
    } else {
      console.warn('[AudioService] BGM buffer not found:', bufferKey);
    }
  }

  pauseBGM() {
    if (!this.currentBgmSource || !this.ctx || this.bgmIsPaused) return;
    try {
      const buffer = this.currentBgmSource.buffer;
      if (buffer) {
        const elapsed = this.ctx.currentTime - this.bgmStartedAt;
        this.bgmPausedOffset = elapsed % buffer.duration;
      }
      this.currentBgmSource.stop(0);
      this.currentBgmSource.disconnect();
    } catch (_) {}
    this.currentBgmSource = null;
    this.bgmIsPaused = true;
  }

  resumeBGM() {
    if (!this.bgmEnabled || !this.ctx || !this.bgmIsPaused || !this.currentBgmKey) return;
    const bufferKey = this.currentBgmKey === 'title' ? 'bgm_title' : 'bgm_game';
    const buffer = this.buffers[bufferKey];
    if (buffer) this._playBGMBuffer(buffer, this.bgmPausedOffset);
  }

  stopBGM() {
    if (this.currentBgmSource) {
      try { this.currentBgmSource.stop(0); } catch (_) {}
      try { this.currentBgmSource.disconnect(); } catch (_) {}
      this.currentBgmSource = null;
    }
    this.currentBgmKey   = null;
    this.pendingBGM      = null;
    this.bgmPausedOffset = 0;
    this.bgmStartedAt    = 0;
    this.bgmIsPaused     = false;
  }

  stopAll() {
    this.stopBGM();
    this.activeSESources.forEach(src => {
      try { src.stop(0); } catch (_) {}
      try { src.disconnect(); } catch (_) {}
    });
    this.activeSESources.clear();
  }

  private _playBGMBuffer(buffer: AudioBuffer, offset: number = 0) {
    if (!this.ctx || !this.bgmGain) return;
    try {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(this.bgmGain);
      source.start(0, offset % buffer.duration);
      this.currentBgmSource = source;
      this.bgmStartedAt = this.ctx.currentTime - offset % buffer.duration;
      this.bgmIsPaused = false;
    } catch (e) {
      console.warn('[AudioService] _playBGMBuffer failed:', e);
    }
  }

  // --- SE ---
  // IMPORTANT: state が 'ready' 以外のときは再生しない（init() を呼ばない）
  private playSE(key: string) {
    if (!this.seEnabled || this.state !== 'ready' || !this.ctx || !this.seGain) return;
    try {
      if (this.ctx.state === 'suspended') { this.ctx.resume().catch(() => {}); return; }
      const buffer = this.buffers[key];
      if (!buffer) return; // バッファなしは無音で続行
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.seGain);
      source.onended = () => this.activeSESources.delete(source);
      this.activeSESources.add(source);
      source.start(0);
    } catch (e) {
      console.warn('[AudioService] playSE failed:', key, e);
    }
  }

  setDangerLevel(ratio: number) {
    if (!this.currentBgmSource || !this.ctx) return;
    try {
      const rate = ratio > 0.5 ? 1.0 + (ratio - 0.5) * 0.3 : 1.0;
      this.currentBgmSource.playbackRate.setValueAtTime(Math.min(rate, 1.3), this.ctx.currentTime);
    } catch (_) {}
  }

  playMove()                    { this.playSE('se_move'); }
  playRotate()                  { this.playSE('se_rotate'); }
  playLock()                    { this.playSE('se_lock'); }
  playLockHeavy()               { this.playSE('se_drop'); }
  playHardDrop()                { this.playSE('se_drop'); }
  playLineClear(_lines: number) { this.playSE('se_clear'); }
  playTSpin()                   { this.playSE('se_tspin'); }
  playAllClear()                { this.playSE('se_tspin'); }
  playPause()                   { this.playSE('se_rotate'); }

  playCombo(combo: number) {
    if (!this.seEnabled || this.state !== 'ready' || !this.ctx || !this.seGain) return;
    try {
      const buffer = this.buffers['se_clear'];
      if (!buffer) return;
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = Math.pow(2, Math.min(combo, 12) / 12);
      source.connect(this.seGain);
      source.onended = () => this.activeSESources.delete(source);
      this.activeSESources.add(source);
      source.start(0);
    } catch (e) {
      console.warn('[AudioService] playCombo failed:', e);
    }
  }

  playGameOver() {
    this.stopAll();
    this.playSE('se_gameover');
  }
}

export const audioService = new AudioService();
