
class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private seGain: GainNode | null = null;
  private enabled: boolean = true;
  
  private currentBgmSource: AudioBufferSourceNode | null = null;
  private currentBgmKey: string | null = null;
  
  // Storage for loaded audio buffers
  private buffers: Record<string, AudioBuffer> = {};
  
  // File paths configuration
  // Note: Served relative to public root. 
  // e.g. /public/assets/foo.mp3 -> /assets/foo.mp3
  private readonly ASSETS = {
    bgm_title: '/assets/bgm_title.mp3',
    bgm_game: '/assets/bgm_game.mp3',
    se_move: '/assets/se_move.wav',
    se_rotate: '/assets/se_rotate.wav',
    se_drop: '/assets/se_drop.wav',
    se_lock: '/assets/se_lock.wav',
    se_clear: '/assets/se_clear.wav',
    se_tspin: '/assets/se_tspin.wav',
    se_gameover: '/assets/se_gameover.wav',
    se_hold: '/assets/se_move.wav',
  };

  constructor() {
    // Lazy init
  }

  async init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        
        // Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 1.0; 
        this.masterGain.connect(this.ctx.destination);

        // BGM Gain
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = 0.5; 
        this.bgmGain.connect(this.masterGain);

        // SE Gain
        this.seGain = this.ctx.createGain();
        this.seGain.gain.value = 0.8;
        this.seGain.connect(this.masterGain);

        // Load all assets
        await this.loadAllAssets();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private async loadAllAssets() {
      if (!this.ctx) return;
      
      const promises = Object.entries(this.ASSETS).map(async ([key, url]) => {
          try {
              const response = await fetch(url);
              if (!response.ok) throw new Error(`Failed to fetch ${url}`);
              const arrayBuffer = await response.arrayBuffer();
              const audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer);
              this.buffers[key] = audioBuffer;
          } catch (e) {
              console.warn(`Audio load failed for ${key} (${url}). Will use fallback sound.`);
          }
      });

      await Promise.all(promises);
      console.log("Audio assets loading check complete");
  }

  toggle(on: boolean) {
    this.enabled = on;
    if (!on) {
      this.stopBGM();
    } else {
      if (this.currentBgmKey) {
         this.startBGM(this.currentBgmKey as 'title' | 'game');
      }
    }
  }
  
  // Custom BGM support (File upload from UI)
  async loadCustomBgm(file: File): Promise<boolean> {
    if (!this.ctx) this.init();
    if (!this.ctx) return false;
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = await this.ctx.decodeAudioData(arrayBuffer);
        this.buffers['custom'] = buffer;
        return true;
    } catch (e) {
        console.error("Failed to decode custom audio", e);
        return false;
    }
  }

  setDangerLevel(ratio: number) {
     if (!this.currentBgmSource || !this.ctx) return;
     const rate = ratio > 0.5 ? 1.0 + ((ratio - 0.5) * 0.3) : 1.0;
     try {
         this.currentBgmSource.playbackRate.setValueAtTime(Math.min(rate, 1.3), this.ctx.currentTime);
     } catch(e) {}
  }

  // --- BGM Control ---

  startBGM(mode: 'title' | 'game') {
    if (!this.enabled || !this.ctx) return;

    let bufferKey = mode === 'title' ? 'bgm_title' : 'bgm_game';
    if (mode === 'game' && this.buffers['custom']) {
        bufferKey = 'custom';
    }

    if (this.currentBgmKey === mode && this.currentBgmSource) return;

    this.stopBGM();
    this.currentBgmKey = mode;

    const buffer = this.buffers[bufferKey];
    if (buffer) {
        this.playBuffer(buffer, this.bgmGain, true);
    } else {
        // Fallback for BGM? Maybe simple drone or silence. 
        // For now, silence is better than an annoying beep loop.
        console.log(`BGM ${bufferKey} not found. Silence.`);
    }
  }

  stopBGM() {
    if (this.currentBgmSource) {
      try { this.currentBgmSource.stop(); } catch(e){}
      this.currentBgmSource.disconnect();
      this.currentBgmSource = null;
    }
    this.currentBgmKey = null;
  }

  private playBuffer(buffer: AudioBuffer, destination: GainNode, loop: boolean = false): AudioBufferSourceNode {
      const source = this.ctx!.createBufferSource();
      source.buffer = buffer;
      source.loop = loop;
      source.connect(destination);
      source.start(0);
      
      if (loop) {
          this.currentBgmSource = source;
      }
      return source;
  }

  private playSE(key: string) {
      if (!this.enabled || !this.ctx || !this.seGain) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const buffer = this.buffers[key];
      if (buffer) {
          const source = this.ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(this.seGain);
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
    
    // Default synth settings
    let freq = 440;
    let type: OscillatorType = 'sine';
    let duration = 0.1;
    let volume = 0.1;

    // Simple synthesis matching the game feel
    if (key.includes('move')) { 
        freq = 300; type = 'triangle'; duration = 0.05; 
    } else if (key.includes('rotate')) { 
        freq = 450; type = 'sine'; duration = 0.05; 
    } else if (key.includes('drop')) { 
        freq = 150; type = 'square'; duration = 0.1; volume = 0.15;
    } else if (key.includes('lock')) { 
        freq = 200; type = 'square'; duration = 0.08; 
    } else if (key.includes('clear')) { 
        freq = 800; type = 'sine'; duration = 0.2; 
        osc.frequency.linearRampToValueAtTime(1200, t + 0.2);
    } else if (key.includes('tspin')) { 
        freq = 600; type = 'sawtooth'; duration = 0.3;
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.3);
    } else if (key.includes('gameover')) {
        freq = 300; type = 'sawtooth'; duration = 1.0;
        osc.frequency.exponentialRampToValueAtTime(50, t + 1.0);
    }

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    
    osc.start(t);
    osc.stop(t + duration);
  }

  // --- SE Mappings ---

  playMove() {
    this.playSE('se_move');
  }

  playRotate() {
    this.playSE('se_rotate');
  }

  playLock() {
    this.playSE('se_lock');
  }

  playLockHeavy() {
    this.playSE('se_drop'); 
  }

  playHardDrop() {
    this.playSE('se_drop');
  }

  playLineClear(lines: number) {
    this.playSE('se_clear');
  }

  playTSpin() {
    this.playSE('se_tspin');
  }

  playCombo(combo: number) {
     if (!this.enabled || !this.ctx || !this.seGain) return;
     const buffer = this.buffers['se_clear'];
     
     if (buffer) {
         // File exists: pitch shift it
         const source = this.ctx.createBufferSource();
         source.buffer = buffer;
         source.connect(this.seGain);
         const semitones = Math.min(combo, 12); 
         source.playbackRate.value = Math.pow(2, semitones / 12);
         source.start(0);
     } else {
         // Fallback: synth pitch shift
         const t = this.ctx.currentTime;
         const osc = this.ctx.createOscillator();
         const gain = this.ctx.createGain();
         osc.connect(gain);
         gain.connect(this.seGain);
         
         const baseFreq = 800 * Math.pow(1.06, combo); // Simple step up
         osc.frequency.setValueAtTime(baseFreq, t);
         osc.type = 'sine';
         
         gain.gain.setValueAtTime(0.1, t);
         gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
         
         osc.start(t);
         osc.stop(t + 0.15);
     }
  }

  playAllClear() {
     this.playSE('se_tspin'); 
  }

  playGameOver() {
    this.stopBGM();
    this.playSE('se_gameover');
  }

  playPause() {
    this.playSE('se_rotate'); 
  }
}

export const audioService = new AudioService();
