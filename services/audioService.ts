class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private seGain: GainNode | null = null;
  private bgmEnabled: boolean = true;
  private seEnabled: boolean = true;

  private currentBgmSource: AudioBufferSourceNode | null = null;
  private currentBgmKey: string | null = null;
  private activeSESources: Set<AudioBufferSourceNode> = new Set();

  private buffers: Record<string, AudioBuffer> = {};
  private isLoaded: boolean = false;
  private isInitializing: boolean = false;
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
    se_hold:     '/assets/se_move.mp3',
  };

  async init(): Promise<void> {
    if (this.ctx && this.isLoaded) {
      if (this.ctx.state === 'suspended') await this.ctx.resume().catch(() => {});
      return;
    }
    if (this.isInitializing) return;
    this.isInitializing = true;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.ctx) {
        this.ctx = new AudioCtx();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 1.0;
        this.masterGain.connect(this.ctx.destination);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = 0.5;
        this.bgmGain.connect(this.masterGain);

        this.seGain = this.ctx.createGain();
        this.seGain.gain.value = 0.8;
        this.seGain.connect(this.masterGain);
      }

      if (this.ctx.state === 'suspended') await this.ctx.resume().catch(() => {});

      await this.loadAllAssets();
      this.isLoaded = true;

      // ロード完了後にpendingなBGMがあれば再生
      if (this.pendingBGM) {
        const pending = this.pendingBGM;
        this.pendingBGM = null;
        this.startBGM(pending);
      }
    } finally {
      this.isInitializing = false;
    }
  }

  private async loadAllAssets(): Promise<void> {
    if (!this.ctx) return;
    const promises = Object.entries(this.ASSETS).map(async ([key, url]) => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        this.buffers[key] = await this.ctx!.decodeAudioData(arrayBuffer);
      } catch (e) {
        console.warn(`Audio load skipped: ${key} (${url})`);
      }
    });
    await Promise.all(promises);
  }

  setBgmEnabled(on: boolean) {
    this.bgmEnabled = on;
    if (!on) {
      this.stopBGM();
    } else if (this.currentBgmKey) {
      this.startBGM(this.currentBgmKey as 'title' | 'game');
    }
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

  getBgmEnabled(): boolean { return this.bgmEnabled; }
  getSeEnabled(): boolean  { return this.seEnabled; }

  // --- BGM ---

  startBGM(mode: 'title' | 'game') {
    if (!this.bgmEnabled) return;

    // 未初期化なら init してから再生（pending に積む）
    if (!this.ctx || !this.isLoaded) {
      this.pendingBGM = mode;
      this.init();
      return;
    }

    // 同じBGMがすでに再生中なら何もしない
    if (this.currentBgmKey === mode && this.currentBgmSource) return;

    this.stopBGM();
    this.currentBgmKey = mode;

    const bufferKey = mode === 'title' ? 'bgm_title' : 'bgm_game';
    const buffer = this.buffers[bufferKey];
    if (buffer) {
      this._playBGMBuffer(buffer);
    } else {
      console.log(`BGM not found: ${bufferKey}`);
    }
  }

  stopBGM() {
    if (this.currentBgmSource) {
      try { this.currentBgmSource.stop(0); } catch (_) {}
      try { this.currentBgmSource.disconnect(); } catch (_) {}
      this.currentBgmSource = null;
    }
    this.currentBgmKey = null;
    this.pendingBGM = null;
  }

  // BGM + 鳴っているSE をすべて即停止
  stopAll() {
    this.stopBGM();
    this.activeSESources.forEach(src => {
      try { src.stop(0); } catch (_) {}
      try { src.disconnect(); } catch (_) {}
    });
    this.activeSESources.clear();
  }

  private _playBGMBuffer(buffer: AudioBuffer) {
    if (!this.ctx || !this.bgmGain) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.bgmGain);
    source.start(0);
    this.currentBgmSource = source;
  }

  // --- SE ---

  private playSE(key: string) {
    if (!this.seEnabled || !this.ctx || !this.seGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});

    const buffer = this.buffers[key];
    if (buffer) {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.seGain);
      // 再生終了時に Set から除去
      source.onended = () => this.activeSESources.delete(source);
      this.activeSESources.add(source);
      source.start(0);
    } else {
      this.playFallbackSE(key);
    }
  }

  private playFallbackSE(key: string) {
    if (!this.ctx || !this.seGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.seGain);

    let freq = 440, type: OscillatorType = 'sine', duration = 0.1, volume = 0.1;
    if (key.includes('move'))     { freq = 300; type = 'triangle'; duration = 0.05; }
    else if (key.includes('rotate')) { freq = 450; duration = 0.05; }
    else if (key.includes('drop'))   { freq = 150; type = 'square'; duration = 0.1; volume = 0.15; }
    else if (key.includes('lock'))   { freq = 200; type = 'square'; duration = 0.08; }
    else if (key.includes('clear'))  { freq = 800; duration = 0.2; osc.frequency.linearRampToValueAtTime(1200, t + 0.2); }
    else if (key.includes('tspin'))  { freq = 600; type = 'sawtooth'; duration = 0.3; osc.frequency.exponentialRampToValueAtTime(1200, t + 0.3); }
    else if (key.includes('gameover')) { freq = 300; type = 'sawtooth'; duration = 1.0; osc.frequency.exponentialRampToValueAtTime(50, t + 1.0); }

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.start(t);
    osc.stop(t + duration);
  }

  setDangerLevel(ratio: number) {
    if (!this.currentBgmSource || !this.ctx) return;
    const rate = ratio > 0.5 ? 1.0 + (ratio - 0.5) * 0.3 : 1.0;
    try { this.currentBgmSource.playbackRate.setValueAtTime(Math.min(rate, 1.3), this.ctx.currentTime); } catch (_) {}
  }

  playMove()                     { this.playSE('se_move'); }
  playRotate()                   { this.playSE('se_rotate'); }
  playLock()                     { this.playSE('se_lock'); }
  playLockHeavy()                { this.playSE('se_drop'); }
  playHardDrop()                 { this.playSE('se_drop'); }
  playLineClear(_lines: number)  { this.playSE('se_clear'); }
  playTSpin()                    { this.playSE('se_tspin'); }
  playAllClear()                 { this.playSE('se_tspin'); }
  playPause()                    { this.playSE('se_rotate'); }

  playCombo(combo: number) {
    if (!this.seEnabled || !this.ctx || !this.seGain) return;
    const buffer = this.buffers['se_clear'];
    if (buffer) {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = Math.pow(2, Math.min(combo, 12) / 12);
      source.connect(this.seGain);
      source.onended = () => this.activeSESources.delete(source);
      this.activeSESources.add(source);
      source.start(0);
    } else {
      this.playFallbackSE('se_clear');
    }
  }

  playGameOver() {
    // BGM + 鳴っているSEをすべて止めてからゲームオーバー音を鳴らす
    this.stopAll();
    this.playSE('se_gameover');
  }
}

export const audioService = new AudioService();
