
export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z' | 'G';

export interface Tetromino {
  type: TetrominoType;
  shape: number[][];
  color: string;
}

export type GridCell = {
  type: TetrominoType | null;
  filled: boolean;
  color: string;
};

export type Grid = GridCell[][];

export interface Position {
  x: number;
  y: number;
}

export type GameMode = 'SINGLE' | 'CPU' | 'MULTI';

export interface PlayerState {
  grid: Grid;
  score: number;
  level: number;
  lines: number;
  gameOver: boolean;
  paused: boolean;
  nextQueue: TetrominoType[];
  holdPiece: TetrominoType | null;
  canHold: boolean;
  gameMode: GameMode;
  cpuHealth: number;
  isWinner: boolean;
}

export type ControllerAction = 
  | 'MOVE_LEFT' 
  | 'MOVE_RIGHT' 
  | 'SOFT_DROP' 
  | 'HARD_DROP' 
  | 'ROTATE_CW' 
  | 'ROTATE_CCW' 
  | 'HOLD' 
  | 'PAUSE';

export type ControllerMapping = Record<ControllerAction, number>;

export type MultiPlayerStatus = 'searching' | 'found' | 'ready' | 'starting' | 'playing' | 'defeated';

export interface MultiPlayer {
  id: string;
  name: string;
  status: MultiPlayerStatus;
  isHost: boolean;
  pendingGarbage: number;
  matrix?: string;
}

export interface MultiRoomState {
  roomId: string;
  players: MultiPlayer[];
  phase: 'matching' | 'countdown' | 'playing';
}
