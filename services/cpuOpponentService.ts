import { Grid } from '../types';

export type CpuAttackCallback = (lines: number) => void;
export type CpuStatusCallback = (status: 'idle' | 'playing' | 'defeated') => void;
export type CpuMatrixCallback = (grid: Grid) => void;

class CpuOpponentService {
  private level: number = 1;
  private running: boolean = false;
  private attackListeners: Set<CpuAttackCallback> = new Set();
  private statusListeners: Set<CpuStatusCallback> = new Set();
  private matrixListeners: Set<CpuMatrixCallback> = new Set();

  start(level: number) {
    this.level = level;
    this.running = true;
    console.log(`[CpuOpponent] start (level=${level}) - logic not implemented yet`);
    this.notifyStatus('playing');
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    console.log('[CpuOpponent] stop');
    this.notifyStatus('idle');
  }

  isRunning(): boolean {
    return this.running;
  }

  getLevel(): number {
    return this.level;
  }

  receivePlayerAttack(_lines: number): void {
    // TODO: プレイヤーからの攻撃を CPU 側で受け取る処理
  }

  receivePlayerMatrix(_grid: Grid): void {
    // TODO: プレイヤーの盤面を参考にする処理（必要なら）
  }

  addAttackListener(cb: CpuAttackCallback) { this.attackListeners.add(cb); }
  removeAttackListener(cb: CpuAttackCallback) { this.attackListeners.delete(cb); }

  addStatusListener(cb: CpuStatusCallback) { this.statusListeners.add(cb); }
  removeStatusListener(cb: CpuStatusCallback) { this.statusListeners.delete(cb); }

  addMatrixListener(cb: CpuMatrixCallback) { this.matrixListeners.add(cb); }
  removeMatrixListener(cb: CpuMatrixCallback) { this.matrixListeners.delete(cb); }

  private notifyStatus(status: 'idle' | 'playing' | 'defeated') {
    this.statusListeners.forEach(cb => cb(status));
  }
}

export const cpuOpponentService = new CpuOpponentService();
