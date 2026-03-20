// v1.26: SE先行ロード版 AudioService
// ルール
//   1. SE (小ファイル) を先にロードして即座に ready → SEはすぐ鳴る
//   2. BGM (大ファイル) はバックグラウンドでロード → 完了次第再生
//   3. playSE / startBGM は ready 前は黙ってスキップ（init()の再帰呼び出し禁止）
//   4. 全操作を try-catch で囲み、例外をゲームへ伝播させない

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

  // SE (小ファイル): 先にロードして即座に ready にする
  private readonly SE_ASSETS: Record<string, string> = {
    se_move:     '/assets/se_move.mp3',
    se_rotate:   '/assets/se_rotate.mp3',
    se_drop:     '/assets/se_drop.mp3',
    se_lock:     '/assets/se_lock.mp3',
    se_clear:    '/assets/se_clear.mp3',
    se_tspin:    '/assets/se_tspin.mp3',
    se_gameover: '/assets/se_gameover.mp3',
  };

  // BGM (大ファイル): バックグラウンドでロード
  private readonly BGM_ASSETS: Record<string, string> = {
    bgm_title: '/assets/bgm_title.mp3',
    bgm_game:  '/assets/bgm_game.mp3',
  };

  // ユーザー操作後に一度だけ呼ぶ
  async init(): Promise<void> {
    if (this.state === 'loading' || this.state === 'ready') return;
    this.state = 'loading';

    // タイムアウト (8秒): Brave等でAudioContextがずっとsuspendedのままになるケースに対応
    const initTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AudioService init timeout')), 8000)
    );

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) { this.state = 'error'; return; }

      this.ctx = new AudioCtx();

      // resume() も3秒で打ち切る（Braveで永久待機しないように）
      await Promise.race([
        this.ctx.resume(),
        new Promise<void>((_, rej) => setTimeout(rej, 3000)),
      ]).catch(() => {});

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.5;
      this.bgmGain.connect(this.masterGain);

      this.seGain = this.ctx.createGain();
      this.seGain.gain.value = 0.8;
      this.seGain.connect(this.masterGain);

      // SE だけ先にロード → すぐ ready にする (BGMは小数秒後に使えればOK)
      await Promise.race([this.loadAssets(this.SE_ASSETS), initTimeout]);
      this.state = 'ready';

      // BGM はバックグラウンドでロード（完了次第 pendingBGM を再生）
      this.loadBgmAsync().catch(e => console.warn('[AudioService] BGM load failed:', e));

    } catch (e) {
      console.warn('[AudioService] init failed or timed out:', e);
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

  private async loadAssets(assets: Record<string, string>): Promise<void> {
    if (!this.ctx) return;
    const promises = Object.entries(assets).map(async ([key, url]) => {
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

  // BGM をバックグラウンドでロード（complete 後に pending があれば再生）
  private async loadBgmAsync(): Promise<void> {
    await this.loadAssets(this.BGM_ASSETS);
    // ロード完了後に pending BGM があれば再生
    if (this.pendingBGM && this.state === 'ready') {
      const pending = this.pendingBGM;
      this.pendingBGM = null;
      this.startBGM(pending);
    }
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
