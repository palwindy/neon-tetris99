
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Grid, Position, TetrominoType, GameMode } from '../types';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  TETROMINOS,
  TICK_RATE_BASE,
  SRS_KICKS
} from '../constants';
import { createGrid, checkCollision, rotateMatrix, rotateMatrixCCW, getTetrominoBag, addGarbageToGrid } from '../utils/gameHelpers';
import { audioService } from '../services/audioService';

// Tetris 99 REN (Combo) Attack Table
const T99_REN_TABLE = [
  0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5
];

export interface UseTetrisGameProps {
    gameMode?: GameMode;
    onGameOver?: () => void;
    onLineClear?: (lines: number) => void;
    onTSpin?: (lines: number) => void;
    onAttackSent?: (lines: number) => void;
}

export const useTetrisGame = ({
    gameMode: initialGameMode = 'SINGLE',
    onGameOver,
    onLineClear,
    onTSpin,
    onAttackSent
}: UseTetrisGameProps = {}) => {
  const [grid, setGrid] = useState<Grid>(createGrid());
  const [activePiece, setActivePiece] = useState<TetrominoType>('T');
  const [activeShape, setActiveShape] = useState<number[][]>([]);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [rotationIndex, setRotationIndex] = useState(0); 
  
  const [nextQueue, setNextQueue] = useState<TetrominoType[]>([]);
  const [holdPiece, setHoldPiece] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState(true);
  
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [combo, setCombo] = useState(-1);
  const [backToBack, setBackToBack] = useState(false);

  const [gameMode, setGameMode] = useState<GameMode>('SINGLE');
  const [cpuHealth, setCpuHealth] = useState(100);
  const [isWinner, setIsWinner] = useState(false);
  const [pendingGarbage, setPendingGarbage] = useState(0); // お邪魔予告ゲージ
  const [lastAttackSent, setLastAttackSent] = useState(0); // エフェクト用などに保持
  
  // CPU Attack Timing
  const [nextAttackTime, setNextAttackTime] = useState<number>(0);
  // Player Attack Event { damage, timestamp }
  const [playerAttack, setPlayerAttack] = useState<{ damage: number; id: number } | null>(null);


  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  
  const [clearingRows, setClearingRows] = useState<number[]>([]);
  const [specialMessage, setSpecialMessage] = useState<string | null>(null);
  const isClearingRef = useRef(false);
  const isLockingRef = useRef(false);

  // T-Spin tracking
  const lastMoveWasRotate = useRef(false);
  const lastKickIndex = useRef(0);

  const lockStartTimeRef = useRef<number | null>(null);
  const hardDropLockedRef = useRef(false);
  const LOCK_DELAY_MS = 500;
  
  // CPU Attack Timer Logic
  const attackTimerRef = useRef<number | null>(null);
  const remainingAttackTimeRef = useRef<number>(0);
  const attackIntervalStartRef = useRef<number>(0);
  const currentIntervalDurationRef = useRef<number>(0);

  // Ref to manage the cleanup timer for player attack effects
  const playerAttackCleanupTimerRef = useRef<number | null>(null);

  const gameStateRef = useRef({
    grid,
    activeShape,
    position,
    rotationIndex,
    activePiece,
    nextQueue,
    score,
    lines,
    level,
    combo,
    backToBack,
    gameStarted,
    paused,
    gameOver,
    isClearing: isClearingRef.current,
    gameMode,
    cpuHealth,
    isWinner,
    pendingGarbage
  });

  // Keep Ref synchronized with State for render-based updates
  useEffect(() => {
    gameStateRef.current = {
      ...gameStateRef.current, // Keep other refs that might have been updated manually
      grid,
      activeShape,
      position,
      rotationIndex,
      activePiece,
      nextQueue,
      score,
      lines,
      level,
      combo,
      backToBack,
      gameStarted,
      paused,
      gameOver,
      gameMode,
      cpuHealth,
      isWinner,
      pendingGarbage
    };
  }, [grid, activeShape, position, rotationIndex, activePiece, nextQueue, score, lines, level, combo, backToBack, gameStarted, paused, gameOver, gameMode, cpuHealth, isWinner, pendingGarbage]);

  // CPU Attack Logic with Pause Support
  useEffect(() => {
    if (attackTimerRef.current) {
        clearTimeout(attackTimerRef.current);
        attackTimerRef.current = null;
    }

    if (!gameStarted || gameOver || isWinner || gameMode !== 'CPU') {
        remainingAttackTimeRef.current = 0;
        return;
    }

    if (paused) {
        // If paused, we assume cleanup of the previous effect run has saved the remaining time.
        // We do not start a timer.
        return;
    }

    const queueAttack = () => {
        if (isClearingRef.current) return;
        setPendingGarbage(prev => prev + 1);
        gameStateRef.current.pendingGarbage += 1;
    };

    const scheduleAttack = (delay: number) => {
        setNextAttackTime(Date.now() + delay);
        
        attackIntervalStartRef.current = Date.now();
        currentIntervalDurationRef.current = delay;

        attackTimerRef.current = window.setTimeout(() => {
            queueAttack();
            // Once an attack fires, the "remaining time" from any previous pause is consumed.
            // Start fresh interval.
            remainingAttackTimeRef.current = 0;
            const newInterval = Math.max(3000, 8000 - (level * 200));
            scheduleAttack(newInterval);
        }, delay);
    };

    // Determine delay: use remaining time if resuming, otherwise full interval
    let delay: number;
    if (remainingAttackTimeRef.current > 0) {
        delay = remainingAttackTimeRef.current;
    } else {
        delay = Math.max(3000, 8000 - (level * 200));
    }

    scheduleAttack(delay);

    return () => {
        if (attackTimerRef.current) {
            clearTimeout(attackTimerRef.current);
            attackTimerRef.current = null;
            
            // Calculate and save remaining time for when we resume
            const elapsed = Date.now() - attackIntervalStartRef.current;
            const remaining = Math.max(0, currentIntervalDurationRef.current - elapsed);
            remainingAttackTimeRef.current = remaining;
        }
    };
  }, [gameStarted, paused, gameOver, isWinner, gameMode, level]);

  const getNextFromQueue = useCallback((currentQueue: TetrominoType[]) => {
    let newQueue = [...currentQueue];
    if (newQueue.length < 7) {
      newQueue = [...newQueue, ...getTetrominoBag()];
    }
    const next = newQueue.shift()!;
    return { next, remainingQueue: newQueue };
  }, []);

  const spawnPiece = (type: TetrominoType, queue: TetrominoType[], gridToCheck?: Grid) => {
    const shape = TETROMINOS[type].shape;
    const startPos = { x: Math.floor(BOARD_WIDTH / 2) - Math.floor(shape[0].length / 2), y: 0 };

    lockStartTimeRef.current = null;
    hardDropLockedRef.current = false;

    // Use provided grid or current ref grid
    const collisionGrid = gridToCheck || gameStateRef.current.grid;

    if (checkCollision(startPos, shape, collisionGrid)) {
      setGameOver(true);
      setGameStarted(false);
      audioService.playGameOver();
      isLockingRef.current = false; 
    } else {
      setActivePiece(type);
      setActiveShape(shape);
      setPosition(startPos);
      setRotationIndex(0);
      setCanHold(true);

      // CRITICAL: Update Ref immediately so subsequent hardDrops/moves see the new piece
      gameStateRef.current.activePiece = type;
      gameStateRef.current.activeShape = shape;
      gameStateRef.current.position = startPos;
      gameStateRef.current.rotationIndex = 0;
      gameStateRef.current.nextQueue = queue;
      
      let newNextQueue = [...queue];
      if (newNextQueue.length < 7) {
        newNextQueue = [...newNextQueue, ...getTetrominoBag()];
      }
      setNextQueue(newNextQueue); // Trigger render with expanded queue
      gameStateRef.current.nextQueue = newNextQueue;

      lastMoveWasRotate.current = false;
      lastKickIndex.current = 0;
    }
  };

  const checkTSpin = (
    lockPos: Position, 
    currentGrid: Grid, 
    currentPiece: TetrominoType, 
    rotIdx: number
  ): { isTSpin: boolean; isMini: boolean } => {
    if (currentPiece !== 'T') return { isTSpin: false, isMini: false };
    if (!lastMoveWasRotate.current) return { isTSpin: false, isMini: false };

    const corners = [
      {x: 0, y: 0}, {x: 2, y: 0},
      {x: 0, y: 2}, {x: 2, y: 2}
    ];

    let occupiedCorners = 0;
    const occupiedMap = [false, false, false, false];

    corners.forEach((c, i) => {
      const checkX = lockPos.x + c.x;
      const checkY = lockPos.y + c.y;
      if (checkX < 0 || checkX >= BOARD_WIDTH || checkY >= BOARD_HEIGHT) {
        occupiedCorners++;
        occupiedMap[i] = true;
      } else if (
        checkY >= 0 && 
        currentGrid[checkY] && 
        currentGrid[checkY][checkX] && 
        currentGrid[checkY][checkX].filled
      ) {
        occupiedCorners++;
        occupiedMap[i] = true;
      }
    });

    if (occupiedCorners < 3) return { isTSpin: false, isMini: false };

    if (lastKickIndex.current === 4) {
        return { isTSpin: true, isMini: false };
    }

    let facingCorners = 0; 
    if (rotIdx === 0) {
        if (occupiedMap[0]) facingCorners++;
        if (occupiedMap[1]) facingCorners++;
    } else if (rotIdx === 1) {
        if (occupiedMap[1]) facingCorners++;
        if (occupiedMap[3]) facingCorners++;
    } else if (rotIdx === 2) {
        if (occupiedMap[2]) facingCorners++;
        if (occupiedMap[3]) facingCorners++;
    } else if (rotIdx === 3) {
        if (occupiedMap[0]) facingCorners++;
        if (occupiedMap[2]) facingCorners++;
    }

    const isMini = facingCorners >= 2;
    return { isTSpin: true, isMini };
  };

  const lockPiece = (
    currentPos: Position, 
    currentShape: number[][], 
    currentGrid: Grid, 
    currentPiece: TetrominoType, 
    currentCombo: number, 
    currentRotIdx: number,
    isBackToBack: boolean,
    mode: GameMode,
    health: number
  ) => {
    if (isLockingRef.current) return;
    isLockingRef.current = true;

    // ... Collision Check ...
    let landedOnBlock = false;
    for (let y = 0; y < currentShape.length; y++) {
      for (let x = 0; x < currentShape[y].length; x++) {
        if (currentShape[y][x]) {
          const boardY = currentPos.y + y;
          const boardX = currentPos.x + x;
          if (
            boardY + 1 < BOARD_HEIGHT && 
            boardX >= 0 && boardX < BOARD_WIDTH &&
            currentGrid[boardY + 1] &&
            currentGrid[boardY + 1][boardX].filled
          ) {
             landedOnBlock = true;
             break;
          }
        }
      }
      if (landedOnBlock) break;
    }

    if (landedOnBlock) audioService.playLockHeavy();
    else audioService.playLock();
    
    lockStartTimeRef.current = null;
    hardDropLockedRef.current = false;

    // Create New Grid
    const tempGrid = currentGrid.map(row => row.map(cell => ({ ...cell })));
    
    for (let y = 0; y < currentShape.length; y++) {
      for (let x = 0; x < currentShape[y].length; x++) {
        if (currentShape[y][x]) {
          const ny = currentPos.y + y;
          const nx = currentPos.x + x;
          if (ny >= 0 && ny < BOARD_HEIGHT && nx >= 0 && nx < BOARD_WIDTH) {
            tempGrid[ny][nx] = {
              type: currentPiece,
              filled: true,
              color: TETROMINOS[currentPiece].color
            };
          }
        }
      }
    }

    const fullRowsIndices: number[] = [];
    tempGrid.forEach((row, index) => {
        if (row.every(cell => cell.filled)) {
            fullRowsIndices.push(index);
        }
    });

    const { isTSpin, isMini } = checkTSpin(currentPos, tempGrid, currentPiece, currentRotIdx);

    const remainingRows = tempGrid.filter((row, index) => !fullRowsIndices.includes(index));
    const isAllClear = fullRowsIndices.length > 0 && (remainingRows.length === 0 || remainingRows.every(row => row.every(c => !c.filled)));

    const linesCleared = fullRowsIndices.length;
    let newBackToBack = isBackToBack;
    const isDifficult = (linesCleared === 4) || (isTSpin && linesCleared > 0);
    
    if (linesCleared > 0) {
        if (isDifficult) newBackToBack = true;
        else newBackToBack = false;
    }

    // --- Ver.2.00: Tetris 99 Attack Table ---
    let attackLines = 0;
    if (linesCleared > 0) {
        if (isTSpin) {
            if (isMini) {
                if (linesCleared === 1) attackLines = 0; // T-Spin Mini Single is 0 in T99
                else if (linesCleared === 2) attackLines = 1;
            } else {
                if (linesCleared === 1) attackLines = 2;
                else if (linesCleared === 2) attackLines = 4;
                else if (linesCleared === 3) attackLines = 6;
            }
        } else {
            if (linesCleared === 2) attackLines = 1;
            else if (linesCleared === 3) attackLines = 2;
            else if (linesCleared === 4) attackLines = 4;
        }

        // Back-to-Back Bonus
        if (isBackToBack && isDifficult) attackLines += 1;

        // Combo Bonus (T99 REN Table)
        if (currentCombo >= 0) {
            const tableIdx = Math.min(currentCombo + 1, T99_REN_TABLE.length - 1);
            attackLines += T99_REN_TABLE[tableIdx];
        }

        if (isAllClear) attackLines += 4; // T99 standard is 4
    }

    // CPU mode uses 'damage' variable, we'll map attackLines to it for backward compatibility
    let damage = attackLines;
    if (mode === 'CPU') {
        // CPU mode originally had much higher damage (20 for Tetris), 
        // We'll multiply T99 lines for a similar intensity in CPU mode or keep T99 scale.
        // User asked for T99 spec, so we use T99 scale.
        damage = attackLines; 
    }
    // ----------------------------------------

    if (fullRowsIndices.length > 0) {
        isClearingRef.current = true;
        setGrid(tempGrid);
        // CRITICAL: Sync grid ref immediately to prevent physics glitches during clear animation
        gameStateRef.current.grid = tempGrid;
        
        setClearingRows(fullRowsIndices);

        const newCombo = currentCombo + 1;
        setCombo(newCombo);
        setBackToBack(newBackToBack);

        // --- ATTACK / CANCEL LOGIC ---
        if (attackLines > 0) {
            setPendingGarbage(prev => {
                let remain = attackLines;
                let currentPending = prev;
                // 相殺
                if (currentPending > 0) {
                    const cancelled = Math.min(remain, currentPending);
                    remain -= cancelled;
                    currentPending -= cancelled;
                    console.log(`[Game] Attack ${attackLines} -> Cancelled ${cancelled}. Remaining pending: ${currentPending}`);
                }
                // 攻撃送信
                if (remain > 0) {
                    if (mode === 'MULTI' && onAttackSent) {
                        onAttackSent(remain);
                    }
                    if (mode === 'CPU') {
                        setLastAttackSent(remain);
                    }
                }
                return currentPending;
            });
        }
        // -----------------------------

        // CPU Damage Apply
        let dead = false;
        if (mode === 'CPU') {
            const nextHealth = Math.max(0, health - damage);
            setCpuHealth(nextHealth);
            
            // Trigger Attack Effect
            setPlayerAttack({ damage, id: Date.now() });
            
            // Clear existing cleanup timer if it exists (for rapid attacks)
            if (playerAttackCleanupTimerRef.current) {
                clearTimeout(playerAttackCleanupTimerRef.current);
            }
            // Set a new timer to clear the attack effect after animation duration
            playerAttackCleanupTimerRef.current = window.setTimeout(() => {
                setPlayerAttack(null);
                playerAttackCleanupTimerRef.current = null;
            }, 800);

            if (nextHealth <= 0) {
                dead = true;
                setIsWinner(true);
                setGameStarted(false);
                audioService.playTSpin(); 
            }
        }

        if (!dead) {
            let msg = "";
            let playedSound = false;

            if (isAllClear) {
                msg = "全消し！";
                audioService.playAllClear();
                playedSound = true;
            } else {
                if (isTSpin) {
                    const prefix = isMini ? "T-SPIN MINI" : "T-SPIN";
                    const suffix = ["", " SINGLE", " DOUBLE", " TRIPLE"][linesCleared] || "";
                    msg = `${prefix}${suffix}`;
                    audioService.playTSpin();
                    playedSound = true;
                } else if (linesCleared === 4) {
                    msg = "TETRIS";
                    audioService.playLineClear(4);
                    playedSound = true;
                }

                if (isBackToBack && isDifficult) {
                    msg = `BACK TO BACK\n${msg}`;
                }

                if (newCombo > 0) {
                    msg += `\nREN ${newCombo}`;
                }
            }

            if (damage > 0 && mode === 'CPU') {
               msg = `DMG ${damage}\n${msg}`;
            }
            
            if (!playedSound) {
                if (newCombo > 0) {
                    if (!msg) msg = `REN ${newCombo}`;
                    audioService.playCombo(newCombo);
                } else {
                    audioService.playLineClear(linesCleared);
                }
            }
            
            setSpecialMessage(msg || null);

            setTimeout(() => {
                const state = gameStateRef.current;
                if (!state.gameStarted && !state.isWinner) {
                    setClearingRows([]);
                    isClearingRef.current = false;
                    isLockingRef.current = false;
                    return;
                }

                let newGrid = tempGrid.filter((row, index) => !fullRowsIndices.includes(index));
                while (newGrid.length < BOARD_HEIGHT) {
                    newGrid.unshift(Array(BOARD_WIDTH).fill({ type: null, filled: false, color: '' }));
                }
                
                // --- APPLY PENDING GARBAGE HERE ---
                const pending = gameStateRef.current.pendingGarbage;
                if (pending > 0 && (state.gameMode === 'CPU' || state.gameMode === 'MULTI')) {
                     const result = addGarbageToGrid(newGrid, pending);
                     if (result.gameOver) {
                         setGameOver(true);
                         setGameStarted(false);
                         audioService.playGameOver();
                         return; // Stop here
                     }
                     newGrid = result.grid;
                     setPendingGarbage(0);
                     gameStateRef.current.pendingGarbage = 0; // Sync ref

                     setSpecialMessage(`${pending} lines added!`);
                     setTimeout(() => setSpecialMessage(null), 800);
                     audioService.playMove(); // Sound for receiving garbage
                }
                // ----------------------------------

                // Score Calc
                let baseScore = 0;
                const btbMultiplier = (state.backToBack && isDifficult) ? 1.5 : 1.0;

                if (isTSpin) {
                    if (isMini) {
                        if (linesCleared === 1) baseScore = 200 * btbMultiplier; 
                        else if (linesCleared === 2) baseScore = 400 * btbMultiplier;
                    } else {
                        if (linesCleared === 1) baseScore = 800 * btbMultiplier;
                        else if (linesCleared === 2) baseScore = 1200 * btbMultiplier;
                        else if (linesCleared === 3) baseScore = 1600 * btbMultiplier;
                    }
                } else {
                    if (linesCleared === 1) baseScore = 100;
                    else if (linesCleared === 2) baseScore = 300;
                    else if (linesCleared === 3) baseScore = 500;
                    else if (linesCleared === 4) baseScore = 800 * btbMultiplier;
                }

                baseScore *= state.level;
                if (newCombo > 0) baseScore += 50 * newCombo * state.level;
                if (isAllClear) baseScore += 3000 * state.level;

                setScore(state.score + baseScore);
                setLines(prev => prev + linesCleared);
                
                if (Math.floor((state.lines + linesCleared) / 10) > Math.floor(state.lines / 10)) {
                    setLevel(l => l + 1);
                }

                setGrid(newGrid);
                // CRITICAL: Sync grid ref again
                gameStateRef.current.grid = newGrid;

                setClearingRows([]);
                if (!pending || pending === 0) setSpecialMessage(null); // Keep garbage message if exists
                isClearingRef.current = false;
                
                let highestRow = BOARD_HEIGHT;
                for (let y = 0; y < BOARD_HEIGHT; y++) {
                    if (newGrid[y].some(c => c.filled)) {
                        highestRow = y;
                        break;
                    }
                }
                audioService.setDangerLevel((BOARD_HEIGHT - highestRow) / BOARD_HEIGHT);

                const { next, remainingQueue } = getNextFromQueue(state.nextQueue);
                spawnPiece(next, remainingQueue, newGrid);
                
                isLockingRef.current = false;

            }, 500); 
        }

    } else {
        // No lines cleared
        if (isTSpin) {
            let scoreAdd = 0;
            if (isMini) {
                setSpecialMessage("T-SPIN MINI");
                scoreAdd = 100 * gameStateRef.current.level;
            } else {
                setSpecialMessage("T-SPIN");
                scoreAdd = 400 * gameStateRef.current.level;
            }
            setScore(prev => prev + scoreAdd);
            audioService.playTSpin();
            setTimeout(() => setSpecialMessage(null), 800);
        }

        setCombo(-1); 
        
        let finalGrid = tempGrid;

        // --- APPLY PENDING GARBAGE HERE (For no-clear lock) ---
        const pending = gameStateRef.current.pendingGarbage;
        if (pending > 0 && (mode === 'CPU' || mode === 'MULTI')) {
             const result = addGarbageToGrid(tempGrid, pending);
             if (result.gameOver) {
                 setGrid(result.grid);
                 setGameOver(true);
                 setGameStarted(false);
                 audioService.playGameOver();
                 return; // Stop
             }
             finalGrid = result.grid;
             setPendingGarbage(0);
             gameStateRef.current.pendingGarbage = 0; // Sync ref

             setSpecialMessage(`${pending} lines added!`);
             setTimeout(() => setSpecialMessage(null), 800);
             audioService.playMove(); // Sound for receiving garbage
        }
        // -----------------------------------------------------

        setGrid(finalGrid);
        // CRITICAL: Sync grid ref immediately for No-clear locks
        gameStateRef.current.grid = finalGrid;
        
        let highestRow = BOARD_HEIGHT;
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            if (finalGrid[y].some(c => c.filled)) {
                highestRow = y;
                break;
            }
        }
        audioService.setDangerLevel((BOARD_HEIGHT - highestRow) / BOARD_HEIGHT);

        const { next, remainingQueue } = getNextFromQueue(gameStateRef.current.nextQueue);
        spawnPiece(next, remainingQueue, finalGrid);

        isLockingRef.current = false;
    }
  };

  const ghostPosition = useMemo(() => {
    if (!gameStarted || paused || gameOver || isClearingRef.current || activeShape.length === 0) return position;
    let ghostY = position.y;
    while (!checkCollision({ x: position.x, y: ghostY + 1 }, activeShape, grid) && ghostY < BOARD_HEIGHT) {
      ghostY++;
    }
    return { x: position.x, y: ghostY };
  }, [position, activeShape, grid, gameStarted, paused, gameOver]);

  const move = useCallback((dir: { x: number; y: number }, isAutoDrop = false) => {
    if (gameOver || paused || !gameStarted || isWinner || isClearingRef.current || isLockingRef.current) return;

    const currentPos = gameStateRef.current.position;
    const currentShape = gameStateRef.current.activeShape;
    const currentGrid = gameStateRef.current.grid;

    const newPos = { x: currentPos.x + dir.x, y: currentPos.y + dir.y };
    if (!checkCollision(newPos, currentShape, currentGrid)) {
      setPosition(newPos);
      gameStateRef.current.position = newPos; // Sync Ref
      
      if (!isAutoDrop) {
        if (!hardDropLockedRef.current) {
          lockStartTimeRef.current = null;
        }
        lastMoveWasRotate.current = false;
        audioService.playMove();
      }
      return true;
    }
    return false;
  }, [gameOver, paused, gameStarted, isWinner]);

  const hardDrop = useCallback(() => {
    if (gameOver || paused || !gameStarted || isWinner || isClearingRef.current || isLockingRef.current) return;
    if (hardDropLockedRef.current) return;
    
    // CRITICAL: Use Ref data to avoid stale closures during rapid fire
    const currentPos = gameStateRef.current.position;
    const currentShape = gameStateRef.current.activeShape;
    const currentGrid = gameStateRef.current.grid;

    let currentY = currentPos.y;
    while (!checkCollision({ x: currentPos.x, y: currentY + 1 }, currentShape, currentGrid) && currentY < BOARD_HEIGHT) {
      currentY++;
    }
    const newPos = { x: currentPos.x, y: currentY };
    
    setPosition(newPos);
    gameStateRef.current.position = newPos; // Sync Ref

    audioService.playHardDrop();
    lockStartTimeRef.current = Date.now();
    hardDropLockedRef.current = true; 
  }, [gameOver, paused, gameStarted, isWinner]);

  const tryRotate = useCallback((direction: 'CW' | 'CCW') => {
    if (gameOver || paused || !gameStarted || isWinner || isClearingRef.current || isLockingRef.current) return;

    // Use ref to ensure latest state
    const currentShape = gameStateRef.current.activeShape;
    const currentPos = gameStateRef.current.position;
    const currentGrid = gameStateRef.current.grid;
    const currentRotation = gameStateRef.current.rotationIndex;
    const currentPiece = gameStateRef.current.activePiece;

    let nextRotation = 0;
    let newShape: number[][] = [];

    if (direction === 'CW') {
        nextRotation = (currentRotation + 1) % 4;
        newShape = rotateMatrix(currentShape);
    } else {
        nextRotation = (currentRotation + 3) % 4;
        newShape = rotateMatrixCCW(currentShape);
    }

    let kickType = 'JLSTZ';
    if (currentPiece === 'I') kickType = 'I';
    if (currentPiece === 'O') kickType = 'JLSTZ'; 

    const kickKey = `${currentRotation}-${nextRotation}`;
    const kicks = SRS_KICKS[kickType]?.[kickKey] || [{x: 0, y: 0}];

    for (let i = 0; i < kicks.length; i++) {
        const offset = kicks[i];
        const testPos = { x: currentPos.x + offset.x, y: currentPos.y + offset.y };
        
        if (!checkCollision(testPos, newShape, currentGrid)) {
            setActiveShape(newShape);
            setPosition(testPos);
            setRotationIndex(nextRotation);

            // Sync Ref
            gameStateRef.current.activeShape = newShape;
            gameStateRef.current.position = testPos;
            gameStateRef.current.rotationIndex = nextRotation;

            lastMoveWasRotate.current = true;
            lastKickIndex.current = i; 
            
            if (!hardDropLockedRef.current) lockStartTimeRef.current = null;
            audioService.playRotate();
            return;
        }
    }
  }, [gameOver, paused, gameStarted, isWinner]);

  const rotate = useCallback(() => tryRotate('CW'), [tryRotate]);
  const rotateCCW = useCallback(() => tryRotate('CCW'), [tryRotate]);

  const hold = useCallback(() => {
    if (gameOver || paused || !canHold || !gameStarted || isWinner || isClearingRef.current || isLockingRef.current) return;
    
    lockStartTimeRef.current = null; 
    hardDropLockedRef.current = false;

    const currentPiece = gameStateRef.current.activePiece;
    const currentHold = holdPiece;
    const currentQueue = gameStateRef.current.nextQueue;
    const currentGrid = gameStateRef.current.grid;

    if (!currentHold) {
      setHoldPiece(currentPiece);
      const { next, remainingQueue } = getNextFromQueue(currentQueue);
      spawnPiece(next, remainingQueue, currentGrid);
    } else {
      const temp = currentHold;
      setHoldPiece(currentPiece);
      const shape = TETROMINOS[temp].shape;
      const startPos = { x: Math.floor(BOARD_WIDTH / 2) - Math.floor(shape[0].length / 2), y: 0 };
      
      if (checkCollision(startPos, shape, currentGrid)) {
          setGameOver(true);
          setGameStarted(false);
          audioService.playGameOver();
      } else {
          setActivePiece(temp);
          setActiveShape(shape);
          setPosition(startPos);
          setRotationIndex(0); 

          // Sync Ref
          gameStateRef.current.activePiece = temp;
          gameStateRef.current.activeShape = shape;
          gameStateRef.current.position = startPos;
          gameStateRef.current.rotationIndex = 0;

          lastKickIndex.current = 0;
      }
    }
    setCanHold(false);
    audioService.playMove();
  }, [holdPiece, canHold, gameOver, paused, gameStarted, getNextFromQueue, isWinner]);

  const moveRef = useRef(move);
  useEffect(() => {
    moveRef.current = move;
  }, [move]);

useEffect(() => {
  if (!gameStarted || paused || gameOver || isWinner || clearingRows.length > 0) return;
  const speed = Math.max(50, Math.pow(0.85, level - 1) * TICK_RATE_BASE);
  const tick = setInterval(() => {
    if (isLockingRef.current) return;
    const moved = moveRef.current({ x: 0, y: 1 }, true);
    if (!moved) {
      if (lockStartTimeRef.current === null) {
        lockStartTimeRef.current = Date.now();
      }
    } else {
      lockStartTimeRef.current = null;
      hardDropLockedRef.current = false;
    }
  }, speed);
  return () => {
    clearInterval(tick);
  };
}, [gameStarted, paused, gameOver, isWinner, level, clearingRows.length]);

  useEffect(() => {
    if (!gameStarted || paused || gameOver || isWinner || clearingRows.length > 0) return;
    const lockCheck = setInterval(() => {
      // Always use Ref for logic loops to avoid closure staleness
      const { position: currentPos, activeShape: currentShape, grid: currentGrid, activePiece: currentPiece, combo: currentCombo, rotationIndex: currentRotIdx, backToBack: isBackToBack, gameMode: mode, cpuHealth: hp } = gameStateRef.current;
      
      if (checkCollision({ x: currentPos.x, y: currentPos.y + 1 }, currentShape, currentGrid)) {
        if (lockStartTimeRef.current === null) {
           lockStartTimeRef.current = Date.now();
        }
        if (Date.now() - lockStartTimeRef.current > LOCK_DELAY_MS) {
           lockPiece(currentPos, currentShape, currentGrid, currentPiece, currentCombo, currentRotIdx, isBackToBack, mode, hp);
        }
      } else {
         if (!hardDropLockedRef.current) {
             lockStartTimeRef.current = null;
         }
      }
    }, 50); 
    return () => clearInterval(lockCheck);
  }, [gameStarted, paused, gameOver, isWinner, clearingRows.length]); 

  const resetGame = (mode?: GameMode, autoStart: boolean = true) => {
    setGameStarted(false); // 一旦停止させる
    setGrid(createGrid());
    setScore(0);
    setLines(0);
    setLevel(1);
    setCombo(-1);
    setBackToBack(false);
    setGameOver(false);
    setIsWinner(false);
    setPaused(false);
    setHoldPiece(null);
    setClearingRows([]);
    setSpecialMessage(null);
    if (mode) setGameMode(mode);
    setCpuHealth(100);
    setNextAttackTime(0);
    setPendingGarbage(0); // Reset pending garbage
    remainingAttackTimeRef.current = 0; // Reset CPU attack timer ref

    isClearingRef.current = false;
    isLockingRef.current = false;
    lockStartTimeRef.current = null;
    hardDropLockedRef.current = false;
    audioService.setDangerLevel(0);

    const initialBag = [...getTetrominoBag(), ...getTetrominoBag()];
    const firstPiece = initialBag.shift()!;
    const shape = TETROMINOS[firstPiece].shape;
    const startPos = { x: Math.floor(BOARD_WIDTH / 2) - Math.floor(shape[0].length / 2), y: 0 };
    
    setNextQueue(initialBag);
    setActivePiece(firstPiece);
    setActiveShape(shape);
    setPosition(startPos);
    setRotationIndex(0);
    setCanHold(true);
    
    // Initial Ref Sync
    gameStateRef.current = {
        ...gameStateRef.current,
        grid: createGrid(),
        score: 0,
        lines: 0,
        level: 1,
        activePiece: firstPiece,
        activeShape: shape,
        position: startPos,
        rotationIndex: 0,
        nextQueue: initialBag,
        gameStarted: autoStart,
        gameOver: false,
        isWinner: false,
        paused: false,
        gameMode: mode || gameStateRef.current.gameMode,
        pendingGarbage: 0
    };

    lastMoveWasRotate.current = false;
    lastKickIndex.current = 0;

    if (autoStart) {
      setGameStarted(true);
    } else {
      setGameStarted(false);
    }
  };

  const quitGame = () => {
    // --- Refを即座にリセット（進行中のsetTimeoutが誤動作しないよう先に実行）---
    isClearingRef.current = false;
    isLockingRef.current = false;
    hardDropLockedRef.current = false;
    lockStartTimeRef.current = null;
    gameStateRef.current = {
      ...gameStateRef.current,
      gameStarted: false,
      paused: false,
      gameOver: false,
      isWinner: false,
    };

    // --- React State をリセット ---
    setGameStarted(false);
    setGameOver(false);
    setIsWinner(false);
    setPaused(false);
    setClearingRows([]);
    setGrid(createGrid());
    setScore(0);
    setLines(0);
    setLevel(1);
    setCombo(-1);
    setBackToBack(false);
    setSpecialMessage(null);
    setPendingGarbage(0);
    audioService.setDangerLevel(0);
    audioService.stopBGM();
  };

  const togglePause = () => {
    if (!gameStarted || gameOver || isWinner) return;
    const newPaused = !paused;
    setPaused(newPaused);
    if (newPaused) audioService.playPause();
  };

  const clearPlayerAttack = useCallback(() => {
    setPlayerAttack(null);
    if (playerAttackCleanupTimerRef.current) {
      clearTimeout(playerAttackCleanupTimerRef.current);
      playerAttackCleanupTimerRef.current = null;
    }
  }, []);

  return {
    grid,
    activePiece,
    activeShape,
    position,
    ghostPosition,
    nextQueue,
    holdPiece,
    score,
    lines,
    level,
    combo,
    gameOver,
    isWinner,
    gameMode,
    cpuHealth,
    nextAttackTime,
    playerAttack,
    pendingGarbage,
    paused,
    gameStarted,
    clearingRows,
    specialMessage,
    move,
    rotate,
    rotateCCW,
    hardDrop,
    hold,
    togglePause,
    resetGame,
    quitGame,
    clearPlayerAttack,
    setGameOver,
    setIsWinner,
    setPendingGarbage
  };
};
