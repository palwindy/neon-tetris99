import { CpuOpponentInstance, CpuInstanceCallbacks } from './cpuAi/cpuOpponentInstance';

class CpuOpponentManager {
  private cpus: Map<string, CpuOpponentInstance> = new Map();

  add(id: string, level: number, callbacks: CpuInstanceCallbacks): CpuOpponentInstance {
    const existing = this.cpus.get(id);
    if (existing) existing.stop();
    const cpu = new CpuOpponentInstance(id, level, callbacks);
    this.cpus.set(id, cpu);
    return cpu;
  }

  get(id: string): CpuOpponentInstance | undefined {
    return this.cpus.get(id);
  }

  has(id: string): boolean {
    return this.cpus.has(id);
  }

  getAll(): CpuOpponentInstance[] {
    return Array.from(this.cpus.values());
  }

  startAll() {
    this.cpus.forEach(c => c.start());
  }

  stopAll() {
    this.cpus.forEach(c => c.stop());
    this.cpus.clear();
  }

  pauseAll() {
    this.cpus.forEach(c => c.pause());
  }

  resumeAll() {
    this.cpus.forEach(c => c.resume());
  }

  receiveAttack(id: string, lines: number) {
    this.cpus.get(id)?.receiveAttack(lines);
  }

  isAnyRunning(): boolean {
    return this.getAll().some(c => c.isPlaying());
  }
}

export const cpuOpponentManager = new CpuOpponentManager();
