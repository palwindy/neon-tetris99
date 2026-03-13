
import { Grid, GridCell, Position, Tetromino, TetrominoType } from '../types';
import { BOARD_HEIGHT, BOARD_WIDTH, COLOR_MAP, TETROMINOS } from '../constants';

export const createGrid = (): Grid => {
  return Array.from(Array(BOARD_HEIGHT), () =>
    Array(BOARD_WIDTH).fill({ type: null, filled: false, color: '' })
  );
};

export const checkCollision = (
  position: Position,
  shape: number[][],
  grid: Grid
): boolean => {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x] !== 0) {
        const newY = y + position.y;
        const newX = x + position.x;

        // 1. Check bounds
        if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
          return true;
        }

        // 2. Check grid occupancy (ignore above board)
        // Add safety check for grid row existence
        if (newY >= 0) {
            if (!grid[newY] || !grid[newY][newX] || grid[newY][newX].filled) {
                return true;
            }
        }
      }
    }
  }
  return false;
};

// Rotate matrix 90 degrees clockwise
export const rotateMatrix = (matrix: number[][]): number[][] => {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const newMatrix = Array.from(Array(cols), () => Array(rows).fill(0));

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      newMatrix[x][rows - 1 - y] = matrix[y][x];
    }
  }
  return newMatrix;
};

// Rotate matrix 90 degrees counter-clockwise
export const rotateMatrixCCW = (matrix: number[][]): number[][] => {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const newMatrix = Array.from(Array(cols), () => Array(rows).fill(0));

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      newMatrix[cols - 1 - x][y] = matrix[y][x];
    }
  }
  return newMatrix;
};

// Fisher-Yates shuffle for 7-bag
export const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const getTetrominoBag = (): TetrominoType[] => {
  const types: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  return shuffleArray(types);
};

// Adds garbage lines to the bottom, pushing everything up
export const addGarbageToGrid = (grid: Grid, lines: number): { grid: Grid; gameOver: boolean } => {
  const newGrid = grid.map(row => [...row]);
  
  // Check if top rows have blocks before shifting
  let gameOver = false;
  for (let i = 0; i < lines; i++) {
    if (newGrid[i] && newGrid[i].some(cell => cell.filled)) {
        gameOver = true;
    }
  }

  // Remove top rows
  newGrid.splice(0, lines);

  // Add garbage rows
  for (let i = 0; i < lines; i++) {
    const holeIndex = Math.floor(Math.random() * BOARD_WIDTH);
    const row: GridCell[] = Array.from({ length: BOARD_WIDTH }, (_, index) => {
      if (index === holeIndex) {
        return { type: null, filled: false, color: '' };
      }
      return { type: 'G', filled: true, color: 'gray' };
    });
    newGrid.push(row);
  }

  // Safety: Ensure grid size
  while(newGrid.length < BOARD_HEIGHT) {
      newGrid.unshift(Array(BOARD_WIDTH).fill({ type: null, filled: false, color: '' }));
  }

  return { grid: newGrid, gameOver };
};
