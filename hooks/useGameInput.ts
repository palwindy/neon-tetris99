
import { useEffect, useRef, useState, useCallback } from 'react';
import { ControllerMapping, ControllerAction } from '../types';

// Default mapping for standard gamepads (Xbox/PlayStation style)
const DEFAULT_MAPPING: ControllerMapping = {
  MOVE_LEFT: 14, // D-Pad Left
  MOVE_RIGHT: 15, // D-Pad Right
  SOFT_DROP: 13, // D-Pad Down
  HARD_DROP: 12, // D-Pad Up
  ROTATE_CW: 0,  // A / Cross
  ROTATE_CCW: 1, // B / Circle (or X / Square depending on layout, usually face button right/top)
  HOLD: 3,       // Y / Triangle
  PAUSE: 9       // Start / Options
};

interface GameActions {
  move: (dir: { x: number; y: number }) => void;
  rotate: () => void;
  rotateCCW: () => void;
  hold: () => void;
  hardDrop: () => void;
  togglePause: () => void;
}

export const useGameInput = (
  actions: GameActions,
  isGameActive: boolean,
  isPaused: boolean,
  gameOver: boolean
) => {
  const [mapping, setMapping] = useState<ControllerMapping>(() => {
    const saved = localStorage.getItem('tetris_mapping');
    return saved ? JSON.parse(saved) : DEFAULT_MAPPING;
  });

  const [isRemapping, setIsRemapping] = useState(false);
  const [remapAction, setRemapAction] = useState<ControllerAction | null>(null);

  // Input state for DAS/ARR (Gamepad)
  const inputState = useRef<{
    [key in ControllerAction]?: {
      pressed: boolean;
      startTime: number;
      lastFireTime: number;
    }
  }>({});

  const actionsRef = useRef(actions);
  useEffect(() => { actionsRef.current = actions; }, [actions]);

  // Save mapping
  useEffect(() => {
    localStorage.setItem('tetris_mapping', JSON.stringify(mapping));
  }, [mapping]);

  // --- Keyboard Handling (Legacy Support + Keyboard mapping could be added later) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isRemapping || !isGameActive || gameOver) return;
      
      // Standard keyboard controls
      switch (e.key) {
        case 'ArrowLeft': actionsRef.current.move({ x: -1, y: 0 }); break;
        case 'ArrowRight': actionsRef.current.move({ x: 1, y: 0 }); break;
        case 'ArrowDown': actionsRef.current.move({ x: 0, y: 1 }); break;
        case 'ArrowUp': actionsRef.current.hardDrop(); break;
        case 'z': case 'Z': actionsRef.current.rotateCCW(); break;
        case 'x': case 'X': actionsRef.current.rotate(); break;
        case 'c': case 'C': actionsRef.current.hold(); break;
        case 'p': case 'P': actionsRef.current.togglePause(); break;
        case 'Escape': actionsRef.current.togglePause(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGameActive, gameOver, isRemapping]);

  // --- Gamepad Polling ---
  useEffect(() => {
    let reqId: number;
    const DAS = 150; // Delay Auto Shift (ms) - Initial delay before repeating
    const ARR = 50;  // Auto Repeat Rate (ms) - Interval between repeats

    const pollGamepads = () => {
      if (isRemapping) {
        // Remap logic handled separately
        const gamepads = navigator.getGamepads();
        for (const gp of gamepads) {
          if (!gp) continue;
          // Find first pressed button
          const pressedIndex = gp.buttons.findIndex(b => b.pressed);
          if (pressedIndex !== -1 && remapAction) {
             updateMapping(remapAction, pressedIndex);
             return; // Exit loop after one mapping
          }
        }
        reqId = requestAnimationFrame(pollGamepads);
        return;
      }

      if (!isGameActive || gameOver || isPaused) {
        reqId = requestAnimationFrame(pollGamepads);
        return;
      }

      const gamepads = navigator.getGamepads();
      if (!gamepads) return;

      const gp = gamepads[0]; // Assume player 1
      if (!gp) {
        reqId = requestAnimationFrame(pollGamepads);
        return;
      }

      const now = performance.now();

      const processAction = (action: ControllerAction, isPressed: boolean, isRepeatable: boolean) => {
        // Initialize state if not exists
        if (!inputState.current[action]) {
            inputState.current[action] = { pressed: false, startTime: 0, lastFireTime: 0 };
        }
        const state = inputState.current[action]!;
        
        if (isPressed) {
          if (!state.pressed) {
            // --- First Press (Rising Edge) ---
            state.pressed = true;
            state.startTime = now;
            state.lastFireTime = now;
            
            // Fire immediately on first press
            triggerAction(action);
          } else if (isRepeatable) {
            // --- Holding (Repeat Logic) ---
            // Check if DAS duration has passed
            if (now - state.startTime >= DAS) {
                // Check ARR
                // Using delta time ensures we don't miss inputs even if frame rate fluctuates
                if (now - state.lastFireTime >= ARR) {
                    triggerAction(action);
                    // Advance lastFireTime to maintain consistent cadence
                    // But if lag is huge, don't burst; catch up to 'now'
                    state.lastFireTime = Math.max(state.lastFireTime + ARR, now - ARR);
                }
            }
          }
        } else {
          // --- Release ---
          state.pressed = false;
        }
      };

      (Object.keys(mapping) as ControllerAction[]).forEach(action => {
        const btnIndex = mapping[action];
        const isPressed = gp.buttons[btnIndex]?.pressed || false;
        
        const repeatable = action === 'MOVE_LEFT' || action === 'MOVE_RIGHT' || action === 'SOFT_DROP';
        processAction(action, isPressed, repeatable);
      });

      reqId = requestAnimationFrame(pollGamepads);
    };

    reqId = requestAnimationFrame(pollGamepads);
    return () => cancelAnimationFrame(reqId);
  }, [isGameActive, gameOver, isPaused, isRemapping, remapAction, mapping]);

  const triggerAction = (action: ControllerAction) => {
    switch (action) {
      case 'MOVE_LEFT': actionsRef.current.move({ x: -1, y: 0 }); break;
      case 'MOVE_RIGHT': actionsRef.current.move({ x: 1, y: 0 }); break;
      case 'SOFT_DROP': actionsRef.current.move({ x: 0, y: 1 }); break;
      case 'HARD_DROP': actionsRef.current.hardDrop(); break;
      case 'ROTATE_CW': actionsRef.current.rotate(); break;
      case 'ROTATE_CCW': actionsRef.current.rotateCCW(); break;
      case 'HOLD': actionsRef.current.hold(); break;
      case 'PAUSE': actionsRef.current.togglePause(); break;
    }
  };

  const startRemap = (action: ControllerAction) => {
    setRemapAction(action);
    setIsRemapping(true);
  };

  const updateMapping = useCallback((action: ControllerAction, btnIndex: number) => {
    setMapping(prev => ({ ...prev, [action]: btnIndex }));
    setRemapAction(null);
    setIsRemapping(false);
  }, []);

  const cancelRemap = () => {
    setRemapAction(null);
    setIsRemapping(false);
  };

  const resetMapping = () => {
    setMapping(DEFAULT_MAPPING);
  };

  return {
    mapping,
    isRemapping,
    remapAction,
    startRemap,
    cancelRemap,
    resetMapping
  };
};
