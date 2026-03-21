
import { Tetromino, TetrominoType } from './types';

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const TICK_RATE_BASE = 800;

export const TETROMINOS: Record<TetrominoType, Tetromino> = {
  I: {
    type: 'I',
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: 'cyan',
  },
  J: {
    type: 'J',
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: 'blue',
  },
  L: {
    type: 'L',
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: 'orange',
  },
  O: {
    type: 'O',
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: 'yellow',
  },
  S: {
    type: 'S',
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: 'green',
  },
  T: {
    type: 'T',
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: 'purple',
  },
  Z: {
    type: 'Z',
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: 'red',
  },
  G: {
    type: 'G',
    shape: [[1]],
    color: 'gray',
  }
};

export const COLOR_MAP: Record<string, string> = {
  cyan: '#06b6d4', // cyan-500
  blue: '#3b82f6', // blue-500
  orange: '#f97316', // orange-500
  yellow: '#eab308', // yellow-500
  green: '#22c55e', // green-500
  purple: '#a855f7', // purple-500
  red: '#ef4444', // red-500
  gray: '#4b5563', // gray-600 (Garbage)
  ghost: 'rgba(255,255,255,0.2)',
  'garbage-white': '#f3f4f6',
  'garbage-gold': '#fbbf24',
};

// Full SRS Wall Kick Data (Tetris 99 / Guideline Compliant)
// Coordinate system: +x is Right, +y is Down.
export const SRS_KICKS: Record<string, Record<string, {x: number, y: number}[]>> = {
  // J, L, S, T, Z
  'JLSTZ': {
    '0-1': [{x:0, y:0}, {x:-1, y:0}, {x:-1, y:-1}, {x:0, y:2}, {x:-1, y:2}],
    '1-0': [{x:0, y:0}, {x:1, y:0}, {x:1, y:1}, {x:0, y:-2}, {x:1, y:-2}],
    '1-2': [{x:0, y:0}, {x:1, y:0}, {x:1, y:1}, {x:0, y:-2}, {x:1, y:-2}],
    '2-1': [{x:0, y:0}, {x:-1, y:0}, {x:-1, y:-1}, {x:0, y:2}, {x:-1, y:2}],
    '2-3': [{x:0, y:0}, {x:1, y:0}, {x:1, y:-1}, {x:0, y:2}, {x:1, y:2}], 
    '3-2': [{x:0, y:0}, {x:-1, y:0}, {x:-1, y:1}, {x:0, y:-2}, {x:-1, y:-2}],
    '3-0': [{x:0, y:0}, {x:-1, y:0}, {x:-1, y:1}, {x:0, y:-2}, {x:-1, y:-2}], 
    '0-3': [{x:0, y:0}, {x:1, y:0}, {x:1, y:-1}, {x:0, y:2}, {x:1, y:2}]
  },
  // I Piece
  'I': {
    '0-1': [{x:0, y:0}, {x:-2, y:0}, {x:1, y:0}, {x:-2, y:1}, {x:1, y:-2}],
    '1-0': [{x:0, y:0}, {x:2, y:0}, {x:-1, y:0}, {x:2, y:-1}, {x:-1, y:2}],
    '1-2': [{x:0, y:0}, {x:-1, y:0}, {x:2, y:0}, {x:-1, y:-2}, {x:2, y:1}],
    '2-1': [{x:0, y:0}, {x:1, y:0}, {x:-2, y:0}, {x:1, y:2}, {x:-2, y:-1}],
    '2-3': [{x:0, y:0}, {x:2, y:0}, {x:-1, y:0}, {x:2, y:-1}, {x:-1, y:2}],
    '3-2': [{x:0, y:0}, {x:-2, y:0}, {x:1, y:0}, {x:-2, y:1}, {x:1, y:-2}],
    '3-0': [{x:0, y:0}, {x:1, y:0}, {x:-2, y:0}, {x:1, y:2}, {x:-2, y:-1}],
    '0-3': [{x:0, y:0}, {x:-1, y:0}, {x:2, y:0}, {x:-1, y:-2}, {x:2, y:1}]
  }
};
