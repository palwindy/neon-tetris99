import { Grid } from '../types';
import { CpuGrid, CpuTetType } from './cpuAi/cpuTypes';
import {
  createCpuGrid,
  addGarbage,
  nextBag,
  gridToMatrixString,
} from './cpuAi/cpuBoard';
import { findBestMove, findRandomMove, DEFAULT_WEIGHTS } from './cpuAi/cpuEvaluator';

export type CpuStatus = 'idle' | 'playing' | 'defeated';

export interface CpuState {
  matrix: string;
  pendingGarbage: number;
  level: number;
}

export type CpuAttackCallback = (lines: number) => void;
export type CpuStatusCallback = (status: CpuStatus) => void;
export type CpuStateCallback = (state: CpuState) => void;

const REN_TABLE = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5];

interface LevelConfig {
  intervalMs: number;
  randomChance: number;
}

const LEVEL_CONFIG: Record<number, LevelConfig> = {
  1: { intervalMs: 5000, randomChance: 0.5 },
  2: { intervalMs: 3500, randomChance: 0.25 },
  3: { intervalMs: 2200, randomChance: 0.1 },
  4: { intervalMs: 1500, randomChance: 0 },
  5: { intervalMs: 1000, randomChance: 0 },
};

function computeAttack(
  cleared: number,
  combo: number,
  isB2BApplicable: boolean,
  allClear: boolean
): number {
  let atk = 0;
  if (cleared === 2) atk = 1;
  else if (cleared === 3) atk = 2;
  else if (cleared === 4) atk = 4;
  if (isB2BApplicable && cleared === 4) atk += 1;
  if (combo >= 0) {
    const idx = Math.min(combo + 1, REN_TABLE.length - 1);
    atk += REN_TABLE[idx];
  }
  if (allClear) atk += 4;
  return atk;
}

class CpuOpponentService {
  private level = 1;
  private running = false;
  private paused = false;
  private grid: CpuGrid = createCpuGrid();
  private bag: CpuTetType[] = [];
  private pendingGarbage = 0;
  private combo = -1;
  private isB2B = false;
  private timer: number | null = null;

  private attackListeners: Set<CpuAttackCallback> = new Set();
  private statusListeners: Set<CpuStatusCallback> = new Set();
  private stateListeners: Set<CpuStateCallback> = new Set();

  start(level: number) {
    this.stop();
    this.level = Math.max(1, Math.min(5, level));
    this.grid = createCpuGrid();
    this.bag = nextBag();
    this.pendingGarbage = 0;
    this.combo = -1;
    this.isB2B = false;
    this.paused = false;
    this.running = true;
    console.log(`[CpuOpponent] start (level=${this.level})`);
    this.notifyStatus('playing');
    this.notifyState();
    this.scheduleNextTick();
  }

  stop() {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.running) {
      this.running = false;
      this.notifyStatus('idle');
    }
  }

  pause() {
    if (!this.running || this.paused) return;
    this.paused = true;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  resume() {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this.scheduleNextTick();
  }

  isRunning() { return this.running; }
  getLevel() { return this.level; }

  receivePlayerAttack(lines: number) {
    if (!this.running || lines <= 0) return;
    // 相殺：CPU が送る予定の保留がないので、純粋に積み上げ予告
    this.pendingGarbage += lines;
    console.log(`[CpuOpponent] receive attack +${lines} (pending=${this.pendingGarbage})`);
    this.notifyState();
  }

  receivePlayerMatrix(_grid: Grid) { /* 未使用 */ }

  addAttackListener(cb: CpuAttackCallback) { this.attackListeners.add(cb); }
  removeAttackListener(cb: CpuAttackCallback) { this.attackListeners.delete(cb); }
  addStatusListener(cb: CpuStatusCallback) { this.statusListeners.add(cb); }
  removeStatusListener(cb: CpuStatusCallback) { this.statusListeners.delete(cb); }
  addStateListener(cb: CpuStateCallback) { this.stateListeners.add(cb); }
  removeStateListener(cb: CpuStateCallback) { this.stateListeners.delete(cb); }

  private scheduleNextTick() {
    if (!this.running || this.paused) return;
    const cfg = LEVEL_CONFIG[this.level] ?? LEVEL_CONFIG[3];
    this.timer = window.setTimeout(() => this.tick(), cfg.intervalMs);
  }

  private nextPiece(): CpuTetType {
    if (this.bag.length === 0) this.bag = nextBag();
    return this.bag.shift()!;
  }

  private notifyAttack(lines: number) {
    if (lines <= 0) return;
    this.attackListeners.forEach(cb => cb(lines));
  }

  private notifyStatus(s: CpuStatus) {
    this.statusListeners.forEach(cb => cb(s));
  }

  private notifyState() {
    const s: CpuState = {
      matrix: gridToMatrixString(this.grid),
      pendingGarbage: this.pendingGarbage,
      level: this.level,
    };
    this.stateListeners.forEach(cb => cb(s));
  }

  private die() {
    this.running = false;
    if (this.timer !== null) { clearTimeout(this.timer); this.timer = null; }
    console.log('[CpuOpponent] defeated');
    this.notifyState();
    this.notifyStatus('defeated');
  }

  private tick() {
    if (!this.running || this.paused) return;

    // 保留ガベージの積み上げ
    if (this.pendingGarbage > 0) {
      const result = addGarbage(this.grid, this.pendingGarbage);
      this.grid = result.grid;
      this.pendingGarbage = 0;
      if (result.topOut) {
        this.die();
        return;
      }
    }

    const piece = this.nextPiece();
    const cfg = LEVEL_CONFIG[this.level] ?? LEVEL_CONFIG[3];
    const move = Math.random() < cfg.randomChance
      ? findRandomMove(this.grid, piece)
      : findBestMove(this.grid, piece, DEFAULT_WEIGHTS);

    if (!move || move.y < 0) {
      this.die();
      return;
    }

    this.grid = move.resultingGrid;
    const cleared = move.cleared;
    const isAllClear = this.grid.every(row => row.every(c => !c));

    if (cleared > 0) {
      this.combo += 1;
      const isDifficult = cleared === 4;
      const attack = computeAttack(cleared, this.combo, this.isB2B && isDifficult, isAllClear);
      this.isB2B = isDifficult;
      this.notifyAttack(attack);
    } else {
      this.combo = -1;
    }

    this.notifyState();
    this.scheduleNextTick();
  }
}

export const cpuOpponentService = new CpuOpponentService();
