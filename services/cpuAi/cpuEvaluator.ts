import { CpuGrid, CpuTetType, CPU_BOARD_WIDTH, CPU_BOARD_HEIGHT, CPU_SHAPES } from './cpuTypes';
import { checkCollision, placePiece, clearLines } from './cpuBoard';

export interface CpuMove {
  rotation: number;
  x: number;
  y: number;
  cleared: number;
  score: number;
  resultingGrid: CpuGrid;
}

export interface CpuWeights {
  lines: number;
  aggregateHeight: number;
  holes: number;
  bumpiness: number;
}

export const DEFAULT_WEIGHTS: CpuWeights = {
  lines: 0.76,
  aggregateHeight: -0.51,
  holes: -0.36,
  bumpiness: -0.18,
};

function columnHeights(g: CpuGrid): number[] {
  const heights = Array<number>(CPU_BOARD_WIDTH).fill(0);
  for (let x = 0; x < CPU_BOARD_WIDTH; x++) {
    for (let y = 0; y < CPU_BOARD_HEIGHT; y++) {
      if (g[y][x]) {
        heights[x] = CPU_BOARD_HEIGHT - y;
        break;
      }
    }
  }
  return heights;
}

function countHoles(g: CpuGrid, heights: number[]): number {
  let holes = 0;
  for (let x = 0; x < CPU_BOARD_WIDTH; x++) {
    const colTop = CPU_BOARD_HEIGHT - heights[x];
    for (let y = colTop + 1; y < CPU_BOARD_HEIGHT; y++) {
      if (!g[y][x]) holes++;
    }
  }
  return holes;
}

function evaluate(g: CpuGrid, cleared: number, w: CpuWeights): number {
  const heights = columnHeights(g);
  const aggregateHeight = heights.reduce((s, h) => s + h, 0);
  const holes = countHoles(g, heights);
  let bumpiness = 0;
  for (let i = 0; i < heights.length - 1; i++) {
    bumpiness += Math.abs(heights[i] - heights[i + 1]);
  }
  return (
    w.lines * cleared +
    w.aggregateHeight * aggregateHeight +
    w.holes * holes +
    w.bumpiness * bumpiness
  );
}

function enumerateMoves(grid: CpuGrid, type: CpuTetType): CpuMove[] {
  const moves: CpuMove[] = [];
  const rotations = CPU_SHAPES[type];
  for (let r = 0; r < rotations.length; r++) {
    const shape = rotations[r];
    for (let x = -3; x <= CPU_BOARD_WIDTH; x++) {
      let y = -2;
      if (checkCollision(grid, shape, x, y)) continue;
      while (!checkCollision(grid, shape, x, y + 1)) y++;
      if (y < -1) continue;
      const placed = placePiece(grid, shape, x, y);
      const result = clearLines(placed);
      moves.push({
        rotation: r,
        x,
        y,
        cleared: result.cleared,
        score: 0,
        resultingGrid: result.grid,
      });
    }
  }
  return moves;
}

export function findBestMove(
  grid: CpuGrid,
  type: CpuTetType,
  weights: CpuWeights = DEFAULT_WEIGHTS
): CpuMove | null {
  const moves = enumerateMoves(grid, type);
  if (moves.length === 0) return null;
  let best: CpuMove | null = null;
  for (const m of moves) {
    const score = evaluate(m.resultingGrid, m.cleared, weights);
    m.score = score;
    if (!best || score > best.score) best = m;
  }
  return best;
}

export function findRandomMove(grid: CpuGrid, type: CpuTetType): CpuMove | null {
  const moves = enumerateMoves(grid, type);
  if (moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}
