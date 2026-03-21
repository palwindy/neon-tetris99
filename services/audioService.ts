// v1.28: スプラッシュ画面対応版 AudioService
// 動作順序:
//   1. init() 呼び出し → AudioContext 作成 → se_logo を即再生
//   2. 全アセット (SE + BGM) をロード
//   3. 完了後 onReadyCallback() を呼んでスプラッシュ画面を閉じる
// ルール:
//   - playSE / startBGM は ready 前は黙ってスキップ
//   - 全操作を try-catch で囲み、例外をゲームへ伝播させない

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
  private state: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
  private pendingBGM: 'title' | 'game' | 'win' | 'lose' | null = null;
  private onReadyCallback: (() => void) | null = null;

  private readonly ALL_ASSETS: Record<string, string> = {
    se_logo:     '/assets/se_logo.ogg?v=1.34',
    se_move:     '/assets/se_move.ogg?v=1.34',
    se_rotate:   '/assets/se_rotate.ogg?v=1.34',
    se_drop:     '/assets/se_drop.ogg?v=1.34',
    se_lock:     '/assets/se_lock.ogg?v=1.34',
    se_clear:    '/assets/se_clear.ogg?v=1.34',
    se_tspin:    '/assets/se_tspin.ogg?v=1.34',
    se_gameover: '/assets/se_gameover.ogg?v=1.35',
    bgm_title:   '/assets/bgm_title.ogg?v=1.35',
    bgm_game:    '/assets/bgm_game.ogg?v=1.35',
    bgm_win:     '/assets/Result (Win).ogg?v=1.44',
    bgm_lose:    '/assets/Result (lose).ogg?v=2.05',
    bgm_clear:   '/assets/bgm_clear.ogg?v=2.05',
    bgm_loss:    '/assets/bgm_gameover.ogg?v=2.05',
    se_ok:       '/assets/se_ok.ogg?v=2.04',
    se_cancel:   '/assets/se_cancel.ogg?v=2.04',
    se_pause:    '/assets/se_pause.ogg?v=2.05',
    se_tetris:   '/assets/se_tetris.ogg?v=2.05',
    se_perfect:  '/assets/se_perfect.ogg?v=2.05',
  };

  /** ロード完了時に呼ぶコールバックを登録する */
  setOnReady(fn: () => void) {
    if (this.state === 'ready') {
      fn(); // すでに準備済みならすぐ呼ぶ
    } else {
      this.onReadyCallback = fn;
    }
  }

  /** ユーザー操作後に一度だけ呼ぶ */
  async init(): Promise<void> {
    if (this.state === 'loading' || this.state === 'ready') return;
    this.state = 'loading';

    // タイムアウト (15秒): Brave等でAudioContextがずっとsuspendedになるケースに対応
    const initTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AudioService init timeout')), 15000)
    );

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) { this.state = 'error'; this.onReadyCallback?.(); return; }

      this.ctx = new AudioCtx();

      // resume() も3秒で打ち切る
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

      // se_logo だけ先に読み込んで即再生
      await this.loadSingleAsset('se_logo', this.ALL_ASSETS['se_logo']);
      this.playSE('se_logo');

      // 残りアセットをすべてロード（タイムアウト付き）
      const rest: Record<string, string> = { ...this.ALL_ASSETS };
      delete rest['se_logo'];
      await Promise.race([this.loadAssets(rest), initTimeout]);

      this.state = 'ready';
      this.onReadyCallback?.();
      this.onReadyCallback = null;

      // ロード完了後に pending BGM があれば再生
      if (this.pendingBGM) {
        const pending = this.pendingBGM;
        this.pendingBGM = null;
        this.startBGM(pending);
      }
    } catch (e) {
      console.warn('[AudioService] init failed or timed out:', e);
      this.state = 'error';
      // エラーでもスプラッシュを閉じる（ゲームを止めない）
      this.onReadyCallback?.();
      this.onReadyCallback = null;
    }
  }

  // iOS 旧仕様対応: decodeAudioData をコールバック・Promise 両対応ラッパーで呼ぶ
  private decodeAudioDataSafe(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      if (!this.ctx) { reject(new Error('no ctx')); return; }
      try {
        const result = this.ctx.decodeAudioData(
          arrayBuffer,
          (decoded) => resolve(decoded),
          (err) => reject(err),
        );
        if (result && typeof (result as any).then === 'function') {
          (result as Promise<AudioBuffer>).then(resolve).catch(reject);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  private async loadSingleAsset(key: string, url: string): Promise<void> {
    if (!this.ctx) return;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      this.buffers[key] = await this.decodeAudioDataSafe(arrayBuffer);
    } catch (e) {
      console.warn(`[AudioService] load skipped: ${key}`, e);
    }
  }

  private async loadAssets(assets: Record<string, string>): Promise<void> {
    if (!this.ctx) return;
    const promises = Object.entries(assets).map(([key, url]) =>
      this.loadSingleAsset(key, url)
    );
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
  startBGM(mode: 'title' | 'game' | 'win' | 'lose') {
    if (!this.bgmEnabled) return;
    if (this.state !== 'ready') { 
      this.pendingBGM = mode; 
      return; 
    }
    if (this.currentBgmKey === mode && this.currentBgmSource && !this.bgmIsPaused) return;
    if (this.currentBgmKey !== mode) this.stopBGM();
    this.currentBgmKey = mode;
    let bufferKey = '';
    if (mode === 'title') bufferKey = 'bgm_title';
    else if (mode === 'game') bufferKey = 'bgm_game';
    else if (mode === 'win') bufferKey = 'bgm_win';
    else if (mode === 'lose') bufferKey = 'bgm_lose';
    
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

  getCurrentBGM() {
    return this.currentBgmKey as 'title' | 'game' | 'win' | 'lose' | null;
  }

  resumeBGM() {
    if (!this.bgmEnabled || !this.ctx || !this.bgmIsPaused || !this.currentBgmKey) return;
    const bufferKey = this.currentBgmKey === 'title' ? 'bgm_title' : this.currentBgmKey === 'game' ? 'bgm_game' : 'bgm_win';
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

  // 自動化によってAutoplayブロックされた場合、ユーザーの初回タッチ時に外部からこれを呼んで復帰させる
  tryResumeContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
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
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
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
  private playSE(key: string) {
    if (!this.seEnabled || !this.ctx || !this.seGain) return;
    // se_logo は state に関わらず再生を試みる（ロード直後に鳴らすため）
    if (key !== 'se_logo' && this.state !== 'ready') return;
    try {
      if (this.ctx.state === 'suspended') { this.ctx.resume().catch(() => {}); return; }
      const buffer = this.buffers[key];
      if (!buffer) return;
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
  playPause()                   { this.playSE('se_pause'); }
  playOk()                      { this.playSE('se_ok'); }
  playCancel()                  { this.playSE('se_cancel'); }
  playLineClear(lines: number) { 
    if (lines === 4) this.playSE('se_tetris');
    else this.playSE('se_clear'); 
  }
  playAllClear()                { this.playSE('se_perfect'); }

  playWinStinger() {
    this.stopAll();
    this.playSE('bgm_clear'); // BGM扱いだが使い勝手のためSEとして鳴らす
  }

  playLossStinger() {
    this.stopAll();
    this.playSE('bgm_loss');
  }

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
