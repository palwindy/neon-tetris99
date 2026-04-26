import { CpuGrid, CpuTetType, CPU_BOARD_WIDTH, CPU_BOARD_HEIGHT } from './cpuTypes';

export function createCpuGrid(): CpuGrid {
  return Array.from({ length: CPU_BOARD_HEIGHT }, () =>
    Array<boolean>(CPU_BOARD_WIDTH).fill(false)
  );
}

export function cloneGrid(g: CpuGrid): CpuGrid {
  return g.map(row => row.slice());
}

export function checkCollision(g: CpuGrid, shape: number[][], px: number, py: number): boolean {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const nx = px + x;
      const ny = py + y;
      if (nx < 0 || nx >= CPU_BOARD_WIDTH || ny >= CPU_BOARD_HEIGHT) return true;
      if (ny < 0) continue;
      if (g[ny][nx]) return true;
    }
  }
  return false;
}

export function placePiece(g: CpuGrid, shape: number[][], px: number, py: number): CpuGrid {
  const out = cloneGrid(g);
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const nx = px + x;
      const ny = py + y;
      if (ny >= 0 && ny < CPU_BOARD_HEIGHT && nx >= 0 && nx < CPU_BOARD_WIDTH) {
        out[ny][nx] = true;
      }
    }
  }
  return out;
}

export function clearLines(g: CpuGrid): { grid: CpuGrid; cleared: number } {
  const remaining = g.filter(row => !row.every(c => c));
  const cleared = CPU_BOARD_HEIGHT - remaining.length;
  while (remaining.length < CPU_BOARD_HEIGHT) {
    remaining.unshift(Array<boolean>(CPU_BOARD_WIDTH).fill(false));
  }
  return { grid: remaining, cleared };
}

export function addGarbage(g: CpuGrid, lines: number): { grid: CpuGrid; topOut: boolean } {
  if (lines <= 0) return { grid: g, topOut: false };
  const cap = Math.min(lines, CPU_BOARD_HEIGHT);
  // Check top-out: do top `cap` rows contain any blocks that would be pushed off?
  let topOut = false;
  for (let y = 0; y < cap; y++) {
    if (g[y].some(c => c)) { topOut = true; break; }
  }
  const out = cloneGrid(g);
  out.splice(0, cap);
  for (let i = 0; i < cap; i++) {
    const hole = Math.floor(Math.random() * CPU_BOARD_WIDTH);
    const row = Array<boolean>(CPU_BOARD_WIDTH).fill(true);
    row[hole] = false;
    out.push(row);
  }
  return { grid: out, topOut };
}

export function nextBag(): CpuTetType[] {
  const bag: CpuTetType[] = ['I','J','L','O','S','T','Z'];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

export function gridToMatrixString(g: CpuGrid): string {
  let s = '';
  for (let y = 0; y < CPU_BOARD_HEIGHT; y++) {
    for (let x = 0; x < CPU_BOARD_WIDTH; x++) {
      s += g[y][x] ? '1' : '0';
    }
  }
  return s;
}

export function spawnPosition(shape: number[][]): { x: number; y: number } {
  const x = Math.floor(CPU_BOARD_WIDTH / 2) - Math.floor(shape[0].length / 2);
  return { x, y: 0 };
}
