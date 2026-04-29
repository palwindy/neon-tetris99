
import { useEffect, useRef, useState, useCallback } from 'react';
import { ControllerMapping, ControllerAction } from '../types';

// 横画面（デフォルト向き）での標準ゲームパッドマッピング
const DEFAULT_MAPPING: ControllerMapping = {
  MOVE_LEFT:   14, // D-Pad Left
  MOVE_RIGHT:  15, // D-Pad Right
  SOFT_DROP:   13, // D-Pad Down
  HARD_DROP:   12, // D-Pad Up
  ROTATE_CW:    0, // A / Cross
  ROTATE_CCW:   1, // B / Circle
  HOLD:         3, // Y / Triangle
  PAUSE:        9, // Start / Options
};

// DAS / ARR 設定（本家 TETRIS 99 準拠）
const DAS_MS  = 150; // 長押し後に連続発動開始するまでの遅延
const ARR_MS  =  50; // 連続発動の間隔

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

  const actionsRef = useRef(actions);
  useEffect(() => { actionsRef.current = actions; }, [actions]);

  // ゲームパッド用 DAS/ARR 状態
  const gpInputState = useRef<{
    [key in ControllerAction]?: { pressed: boolean; startTime: number; lastFireTime: number }
  }>({});

  // Save mapping
  useEffect(() => {
    localStorage.setItem('tetris_mapping', JSON.stringify(mapping));
  }, [mapping]);

  // =============================================
  // キーボード: DAS/ARR 対応
  // =============================================
  useEffect(() => {
    if (!isGameActive || gameOver) return;

    // キーごとに DAS/ARR タイマーを管理
    const dasTimers:  Record<string, ReturnType<typeof setTimeout>>  = {};
    const arrTimers:  Record<string, ReturnType<typeof setInterval>> = {};
    const held: Record<string, boolean> = {};

    const fireKey = (key: string) => {
      switch (key) {
        case 'ArrowLeft':  actionsRef.current.move({ x: -1, y: 0 }); break;
        case 'ArrowRight': actionsRef.current.move({ x:  1, y: 0 }); break;
        case 'ArrowDown':  actionsRef.current.move({ x:  0, y: 1 }); break;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isRemapping) return;

      // 非移動系キー（1回のみ）
      switch (e.key) {
        case 'ArrowUp': actionsRef.current.hardDrop(); return;
        case 'z': case 'Z': actionsRef.current.rotateCCW(); return;
        case 'x': case 'X': actionsRef.current.rotate(); return;
        case 'c': case 'C': actionsRef.current.hold(); return;
        case 'p': case 'P':
        case 'Escape': actionsRef.current.togglePause(); return;
      }

      // 移動系キー: DAS/ARR
      const repeatable = ['ArrowLeft', 'ArrowRight', 'ArrowDown'];
      if (!repeatable.includes(e.key) || held[e.key]) return;
      held[e.key] = true;
      e.preventDefault();

      // 押下瞬間は即時発動
      fireKey(e.key);

      // DAS タイマー開始
      dasTimers[e.key] = setTimeout(() => {
        // ARR ループ開始
        arrTimers[e.key] = setInterval(() => {
          fireKey(e.key);
        }, ARR_MS);
      }, DAS_MS);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key;
      held[key] = false;
      if (dasTimers[key]) { clearTimeout(dasTimers[key]);  delete dasTimers[key]; }
      if (arrTimers[key]) { clearInterval(arrTimers[key]); delete arrTimers[key]; }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup',   handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup',   handleKeyUp);
      // クリーンアップ: 全タイマー解除
      Object.values(dasTimers).forEach(clearTimeout);
      Object.values(arrTimers).forEach(clearInterval);
    };
  }, [isGameActive, gameOver, isRemapping]);

  // =============================================
  // ゲームパッド: DAS/ARR + axes（DPad代替）対応
  // =============================================
  useEffect(() => {
    let reqId: number;

    const pollGamepads = () => {
      // リマップモード
      if (isRemapping) {
        const gamepads = navigator.getGamepads();
        for (const gp of gamepads) {
          if (!gp) continue;
          const pressedIndex = gp.buttons.findIndex(b => b.pressed);
          if (pressedIndex !== -1 && remapAction) {
            updateMapping(remapAction, pressedIndex);
            return;
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
      const gp = gamepads[0];
      if (!gp) { reqId = requestAnimationFrame(pollGamepads); return; }

      const now = performance.now();

      const processAction = (action: ControllerAction, isPressed: boolean, repeatable: boolean) => {
        if (!gpInputState.current[action]) {
          gpInputState.current[action] = { pressed: false, startTime: 0, lastFireTime: 0 };
        }
        const state = gpInputState.current[action]!;

        if (isPressed) {
          if (!state.pressed) {
            state.pressed = true;
            state.startTime = now;
            state.lastFireTime = now;
            triggerAction(action);
          } else if (repeatable) {
            if (now - state.startTime >= DAS_MS && now - state.lastFireTime >= ARR_MS) {
              triggerAction(action);
              state.lastFireTime = Math.max(state.lastFireTime + ARR_MS, now - ARR_MS);
            }
          }
        } else {
          state.pressed = false;
        }
      };

      // buttons によるアクション
      (Object.keys(mapping) as ControllerAction[]).forEach(action => {
        const btnIndex = mapping[action];
        const isPressed = gp.buttons[btnIndex]?.pressed || false;
        const repeatable = action === 'MOVE_LEFT' || action === 'MOVE_RIGHT' || action === 'SOFT_DROP';
        processAction(action, isPressed, repeatable);
      });

      // axes によるDPad代替（Bluetooth/PS系コントローラー対応）
      // axes[0]: 水平 (-1=左, +1=右), axes[1]: 垂直 (-1=上, +1=下)
      if (gp.axes.length >= 2) {
        const ax = gp.axes[0];
        const ay = gp.axes[1];
        processAction('MOVE_LEFT',  ax < -0.5, true);
        processAction('MOVE_RIGHT', ax >  0.5, true);
        processAction('SOFT_DROP',  ay >  0.5, true);
        // axes[1] 上（-1）をハードドロップとして使う場合は buttons で設定する方が誤爆しにくいためスキップ
      }

      reqId = requestAnimationFrame(pollGamepads);
    };

    reqId = requestAnimationFrame(pollGamepads);
    return () => cancelAnimationFrame(reqId);
  }, [isGameActive, gameOver, isPaused, isRemapping, remapAction, mapping]);

  const triggerAction = (action: ControllerAction) => {
    switch (action) {
      case 'MOVE_LEFT':   actionsRef.current.move({ x: -1, y: 0 }); break;
      case 'MOVE_RIGHT':  actionsRef.current.move({ x:  1, y: 0 }); break;
      case 'SOFT_DROP':   actionsRef.current.move({ x:  0, y: 1 }); break;
      case 'HARD_DROP':   actionsRef.current.hardDrop(); break;
      case 'ROTATE_CW':   actionsRef.current.rotate(); break;
      case 'ROTATE_CCW':  actionsRef.current.rotateCCW(); break;
      case 'HOLD':        actionsRef.current.hold(); break;
      case 'PAUSE':       actionsRef.current.togglePause(); break;
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

  const resetMapping = () => setMapping(DEFAULT_MAPPING);

  return { mapping, isRemapping, remapAction, startRemap, cancelRemap, resetMapping };
};
