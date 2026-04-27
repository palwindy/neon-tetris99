import { CpuGrid, CpuTetType } from './cpuTypes';
import {
  createCpuGrid,
  addGarbage,
  nextBag,
  gridToMatrixString,
} from './cpuBoard';
import { findBestMove, findRandomMove, DEFAULT_WEIGHTS } from './cpuEvaluator';

export type CpuStatus = 'idle' | 'playing' | 'defeated';

export interface CpuInstanceState {
  matrix: string;
  pendingGarbage: number;
  status: CpuStatus;
}

export interface CpuInstanceCallbacks {
  onAttack: (lines: number) => void;
  onState: (state: CpuInstanceState) => void;
}

const REN_TABLE = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5];

interface LevelConfig { intervalMs: number; randomChance: number; }

const LEVEL_CONFIG: Record<number, LevelConfig> = {
  1: { intervalMs: 5000, randomChance: 0.5 },
  2: { intervalMs: 3500, randomChance: 0.25 },
  3: { intervalMs: 2200, randomChance: 0.1 },
  4: { intervalMs: 1500, randomChance: 0 },
  5: { intervalMs: 1000, randomChance: 0 },
};

function computeAttack(cleared: number, combo: number, b2bApplied: boolean, allClear: boolean): number {
  let atk = 0;
  if (cleared === 2) atk = 1;
  else if (cleared === 3) atk = 2;
  else if (cleared === 4) atk = 4;
  if (b2bApplied && cleared === 4) atk += 1;
  if (combo >= 0) {
    const idx = Math.min(combo + 1, REN_TABLE.length - 1);
    atk += REN_TABLE[idx];
  }
  if (allClear) atk += 4;
  return atk;
}

export class CpuOpponentInstance {
  readonly id: string;
  readonly level: number;
  private grid: CpuGrid = createCpuGrid();
  private bag: CpuTetType[] = [];
  private pendingGarbage = 0;
  private combo = -1;
  private isB2B = false;
  private status: CpuStatus = 'idle';
  private paused = false;
  private timer: number | null = null;
  private callbacks: CpuInstanceCallbacks;

  constructor(id: string, level: number, callbacks: CpuInstanceCallbacks) {
    this.id = id;
    this.level = Math.max(1, Math.min(5, level));
    this.callbacks = callbacks;
  }

  start() {
    this.clearTimer();
    this.grid = createCpuGrid();
    this.bag = nextBag();
    this.pendingGarbage = 0;
    this.combo = -1;
    this.isB2B = false;
    this.paused = false;
    this.status = 'playing';
    console.log(`[CpuInstance ${this.id}] start (level=${this.level})`);
    this.notifyState();
    this.scheduleNextTick();
  }

  stop() {
    this.clearTimer();
    if (this.status !== 'idle') {
      this.status = 'idle';
    }
  }

  pause() {
    if (this.status !== 'playing' || this.paused) return;
    this.paused = true;
    this.clearTimer();
  }

  resume() {
    if (this.status !== 'playing' || !this.paused) return;
    this.paused = false;
    this.scheduleNextTick();
  }

  isPlaying() { return this.status === 'playing'; }
  getStatus() { return this.status; }

  receiveAttack(lines: number) {
    if (this.status !== 'playing' || lines <= 0) return;
    this.pendingGarbage += lines;
    console.log(`[CpuInstance ${this.id}] receive +${lines} (pending=${this.pendingGarbage})`);
    this.notifyState();
  }

  private clearTimer() {
    if (this.timer !== null) { clearTimeout(this.timer); this.timer = null; }
  }

  private scheduleNextTick() {
    if (this.status !== 'playing' || this.paused) return;
    const cfg = LEVEL_CONFIG[this.level] ?? LEVEL_CONFIG[3];
    this.timer = window.setTimeout(() => this.tick(), cfg.intervalMs);
  }

  private nextPiece(): CpuTetType {
    if (this.bag.length === 0) this.bag = nextBag();
    return this.bag.shift()!;
  }

  private notifyState() {
    this.callbacks.onState({
      matrix: gridToMatrixString(this.grid),
      pendingGarbage: this.pendingGarbage,
      status: this.status,
    });
  }

  private die() {
    this.clearTimer();
    this.status = 'defeated';
    console.log(`[CpuInstance ${this.id}] defeated`);
    this.notifyState();
  }

  private tick() {
    if (this.status !== 'playing' || this.paused) return;

    if (this.pendingGarbage > 0) {
      const result = addGarbage(this.grid, this.pendingGarbage);
      this.grid = result.grid;
      this.pendingGarbage = 0;
      if (result.topOut) { this.die(); return; }
    }

    const piece = this.nextPiece();
    const cfg = LEVEL_CONFIG[this.level] ?? LEVEL_CONFIG[3];
    const move = Math.random() < cfg.randomChance
      ? findRandomMove(this.grid, piece)
      : findBestMove(this.grid, piece, DEFAULT_WEIGHTS);

    if (!move || move.y < 0) { this.die(); return; }

    this.grid = move.resultingGrid;
    const cleared = move.cleared;
    const isAllClear = this.grid.every(row => row.every(c => !c));

    if (cleared > 0) {
      this.combo += 1;
      const isDifficult = cleared === 4;
      const attack = computeAttack(cleared, this.combo, this.isB2B && isDifficult, isAllClear);
      this.isB2B = isDifficult;
      if (attack > 0) this.callbacks.onAttack(attack);
    } else {
      this.combo = -1;
    }

    this.notifyState();
    this.scheduleNextTick();
  }
}
