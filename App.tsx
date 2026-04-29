import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTetrisGame } from './hooks/useTetrisGame';
import { useGameInput } from './hooks/useGameInput';
import { useAppAudio } from './hooks/useAppAudio';
import { useMultiSync } from './hooks/useMultiSync';
import { useCountdown } from './hooks/useCountdown';
import { audioService } from './services/audioService';
import { multiplayerService } from './services/multiplayerService';
import { cpuOpponentManager } from './services/cpuOpponentManager';
import {
  submitCpuTime, submitSingleScore, getSingleRecords, getCpuBestTimes,
  SingleRecord, CpuBestTimes,
} from './services/recordsService';
import { MultiPlayer } from './types';

import { LandscapeLayout } from './components/game/LandscapeLayout';
import SettingsModal from './components/ui/SettingsModal';
import TitleScreen from './components/ui/TitleScreen';
import { MatchingScreen } from './components/vsmulti/MatchingScreen';
import SplashScreen from './components/ui/SplashScreen';
import CpuLevelSelectModal from './components/ui/CpuLevelSelectModal';

const version = "5.15";

/**
 * 端末が縦持ち（ポートレート）の時、内側コンテンツを強制的に
 * 横向き（時計回り90°）で表示する。横持ちの時はそのまま。
 * 画面全体（ゲーム画面・タイトル・マッチング・モーダル）に共通適用。
 */
const ForcedLandscape: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPortrait, setIsPortrait] = useState(
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false
  );

  useEffect(() => {
    const update = () => setIsPortrait(window.innerHeight > window.innerWidth);
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  if (!isPortrait) {
    return <div className="w-full h-full">{children}</div>;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '100vh',
        left: 0,
        width: '100vh',
        height: '100vw',
        transform: 'rotate(-90deg)',
        transformOrigin: 'top left',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
};

function App() {
  const [currentScreen, setCurrentScreen] = useState('title');
  const [showTitle,    setShowTitle]    = useState(true);
  const [showSplash,   setShowSplash]   = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showCpuLevel, setShowCpuLevel] = useState(false);
  const [cpuLevel,     setCpuLevel]     = useState<1 | 2 | 3 | 4 | 5>(3);

  // VS CPU タイマー
  const cpuTimerStartRef = useRef<number | null>(null);
  const cpuTimerTickRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cpuElapsed, setCpuElapsed] = useState(0); // 秒（小数含む）
  const [cpuBestTimes, setCpuBestTimes] = useState<CpuBestTimes>(() => getCpuBestTimes());
  const [cpuResult, setCpuResult] = useState<{ time: number; isNewRecord: boolean } | null>(null);

  // SINGLE ハイスコア
  const [singleTop5, setSingleTop5]   = useState<SingleRecord[]>(() => getSingleRecords());
  const [singleResult, setSingleResult] = useState<{ rank: number; isNewRecord: boolean } | null>(null);

  // --- ゲームコア ---
  const handleAttackSent = useCallback((lines: number) => {
    // VS MULTI 中は Firebase 経由で全プレイヤー（人＋CPU）に送信
    multiplayerService.sendAttack(lines);
  }, []);

  const handleFinishingStarted = useCallback((type: 'win' | 'lose', mode: any) => {
    if (mode === 'MULTI' && type === 'lose') {
      console.log(`[App] Loss finishing started. Updating status to defeated.`);
      multiplayerService.updateStatus('defeated');
    }
  }, []);

  const {
    grid, activePiece, activeShape, position, ghostPosition,
    nextQueue, holdPiece, score, lines, level,
    gameOver, isWinner, paused, gameStarted, clearingRows, specialMessage,
    gameMode, cpuHealth, nextAttackTime, playerAttack, pendingGarbage,
    move, rotate, rotateCCW, hardDrop, hold, togglePause, resetGame, startGame, quitGame,
    triggerFinishAnimation, isFinishing,
    setIsCountdown, countdownValue, setCountdownValue,
    setPendingGarbage,
  } = useTetrisGame({
    onAttackSent: handleAttackSent,
    onFinishingStarted: handleFinishingStarted,
    cpuLevel,
  });

  const isCountdown = countdownValue !== null;

  const { mapping, isRemapping, remapAction, startRemap, cancelRemap, resetMapping } = useGameInput(
    { move, rotate, rotateCCW, hardDrop, hold, togglePause },
    gameStarted && !showSettings && !isCountdown,
    paused,
    gameOver,
  );

  const { bgmOn, seOn, audioReady, handleBgmToggle, handleSeToggle } = useAppAudio({
    showTitle, showSplash, currentScreen,
    gameStarted, paused, gameOver, isWinner,
    togglePause, setShowSplash,
  });

  const { opponents, roomConfig, isHost } = useMultiSync({
    gameMode, gameStarted, gameOver, isWinner,
    currentScreen, isFinishing, triggerFinishAnimation, setPendingGarbage,
  });

  // --- ホスト側 CPU 駆動 ---
  // ゲーム開始時に config の CPU 枠分だけ cpuOpponentManager に登録＆開始
  useEffect(() => {
    if (gameMode !== 'MULTI' || !gameStarted || !isHost || !roomConfig) return;
    if (cpuOpponentManager.isAnyRunning()) return;

    // 念のため前回のローカル CPU を完全クリア（残骸防止）
    cpuOpponentManager.stopAll();

    console.log('[App] starting CPU instances for slots:', roomConfig.slots);
    roomConfig.slots.forEach((slot, idx) => {
      if (slot.kind !== 'CPU') return;
      const cpuId = `cpu_${idx + 1}`;
      const lvl = slot.cpuLevel ?? 3;
      const cpu = cpuOpponentManager.add(cpuId, lvl, {
        onState: (state) => {
          multiplayerService.updateCpuPlayer(cpuId, {
            matrix: state.matrix,
            status: state.status === 'defeated' ? 'defeated' : 'playing',
          });
        },
        onAttack: (linesAtk) => {
          multiplayerService.sendAttack(linesAtk, cpuId);
        },
      });
      cpu.start();
    });
  }, [gameMode, gameStarted, isHost, roomConfig]);

  // 終了時 CPU 停止
  useEffect(() => {
    if (gameMode !== 'MULTI' || !isHost) return;
    if ((gameOver || isWinner) && cpuOpponentManager.isAnyRunning()) {
      cpuOpponentManager.stopAll();
    }
  }, [gameOver, isWinner, gameMode, isHost]);

  const { runCountdownSequence } = useCountdown({
    resetGame, startGame, setIsCountdown, setCountdownValue,
  });

  // --- CPU 攻撃タイミング点滅（CPU モード単独用） ---
  const [blinkDuration, setBlinkDuration] = useState('2s');
  useEffect(() => {
    if (!gameStarted || gameMode !== 'CPU' || paused || isWinner) return;
    const id = setInterval(() => {
      const diff = nextAttackTime - Date.now();
      const d = diff < 1000 ? '0.15s' : diff < 3000 ? '0.5s' : '2s';
      setBlinkDuration(cur => cur === d ? cur : d);
    }, 200);
    return () => clearInterval(id);
  }, [nextAttackTime, gameStarted, gameMode, paused, isWinner]);

  // --- VS CPU タイマー ---
  // ゲーム開始でタイマー開始、終了でタイマー停止
  useEffect(() => {
    if (gameMode !== 'CPU') return;
    if (gameStarted && !gameOver && !isWinner && !paused) {
      // タイマー開始（再開時は既存 startRef を引き継ぐ）
      if (cpuTimerStartRef.current === null) {
        cpuTimerStartRef.current = Date.now() - cpuElapsed * 1000;
      }
      if (!cpuTimerTickRef.current) {
        cpuTimerTickRef.current = setInterval(() => {
          if (cpuTimerStartRef.current !== null) {
            setCpuElapsed((Date.now() - cpuTimerStartRef.current) / 1000);
          }
        }, 100);
      }
    } else {
      // 一時停止 or 終了 → タイマー停止
      if (cpuTimerTickRef.current) {
        clearInterval(cpuTimerTickRef.current);
        cpuTimerTickRef.current = null;
      }
      if (paused && cpuTimerStartRef.current !== null) {
        // ポーズ中は elapsed を保持（再開時に offset として使う）
        // 次の startRef は再開時に再計算される
        cpuTimerStartRef.current = null;
      }
    }
    return () => {
      if (cpuTimerTickRef.current) {
        clearInterval(cpuTimerTickRef.current);
        cpuTimerTickRef.current = null;
      }
    };
  }, [gameMode, gameStarted, gameOver, isWinner, paused]);

  // 勝利時：タイム確定 & 記録保存
  useEffect(() => {
    if (gameMode !== 'CPU' || !isWinner) return;
    const finalTime = cpuElapsed;
    const isNewRecord = submitCpuTime(cpuLevel, finalTime);
    setCpuResult({ time: finalTime, isNewRecord });
    setCpuBestTimes(getCpuBestTimes());
  }, [isWinner, gameMode]); // eslint-disable-line

  // ゲームオーバー時（SINGLE）：スコア登録
  useEffect(() => {
    if (gameMode !== 'SINGLE' || !gameOver) return;
    const result = submitSingleScore(score, lines, level);
    setSingleTop5(result.records);
    setSingleResult({ rank: result.rank, isNewRecord: result.isNewRecord });
  }, [gameOver, gameMode]); // eslint-disable-line

  // --- 画面遷移ハンドラ ---
  const handleStartGame = useCallback((mode: 'SINGLE' | 'CPU') => {
    setShowTitle(false);
    setCurrentScreen('game');
    runCountdownSequence(mode);
  }, [runCountdownSequence]);

  const handleStartCpu = useCallback(() => {
    setShowCpuLevel(true);
  }, []);

  const handleCpuLevelSelected = useCallback((lv: 1 | 2 | 3 | 4 | 5) => {
    setCpuLevel(lv);
    setShowCpuLevel(false);
    // タイマーリセット
    cpuTimerStartRef.current = null;
    setCpuElapsed(0);
    setCpuResult(null);
    handleStartGame('CPU');
  }, [handleStartGame]);

  // TitleScreen の selecting 状態をリセットするため key を使う
  const [titleKey, setTitleKey] = useState(0);

  const handleCpuLevelCancel = useCallback(() => {
    setShowCpuLevel(false);
    setTitleKey(k => k + 1); // TitleScreen を再マウントして selecting をリセット
  }, []);

  const handleMultiplayerGameStart = useCallback((_roomId: string, _players: MultiPlayer[]) => {
    setCurrentScreen('game');
    multiplayerService.updateStatus('playing');
    runCountdownSequence('MULTI');
  }, [runCountdownSequence]);

  const handleQuitToTitle = useCallback(() => {
    audioService.stopAll();
    if (gameMode === 'MULTI') {
      cpuOpponentManager.stopAll();
      multiplayerService.leaveRoom();
    }
    quitGame();
    setShowTitle(true);
    setCurrentScreen('title');
  }, [gameMode, quitGame]);

  const handleRetry = useCallback(() => {
    audioService.stopAll();
    if (gameMode === 'MULTI') {
      cpuOpponentManager.stopAll();
      multiplayerService.leaveRoom();
      setCurrentScreen('matching');
      resetGame('MULTI', false);
    } else {
      // CPU モードはタイマーとリザルトをリセット
      if (gameMode === 'CPU') {
        cpuTimerStartRef.current = null;
        setCpuElapsed(0);
        setCpuResult(null);
      }
      if (gameMode === 'SINGLE') setSingleResult(null);
      runCountdownSequence(gameMode);
    }
  }, [gameMode, runCountdownSequence, resetGame]);

  // --- レイアウト共通 props ---
  const overlayProps = {
    playerAttack, gameOver, isWinner, paused, gameStarted, score,
    bgmOn, seOn, onBgmToggle: handleBgmToggle, onSeToggle: handleSeToggle,
    onResume: togglePause, onRetry: handleRetry, onQuitToTitle: handleQuitToTitle,
    // モード別リザルト
    gameMode,
    cpuElapsed, cpuResult,
    singleTop5, singleResult,
  };

  const layoutProps = {
    version,
    grid, activeShape, position, activePiece, clearingRows, specialMessage, ghostPosition, countdownValue,
    nextQueue, holdPiece,
    score, lines, level,
    gameMode, gameStarted, paused,
    cpuHealth, blinkDuration,
    pendingGarbage, gameOpponents: opponents,
    move, hardDrop, rotate, rotateCCW, hold, togglePause,
    overlayProps,
  };

  return (
    <div
      className="h-[100dvh] bg-neutral-950 text-white overflow-hidden font-sans select-none touch-none"
      onClick={() => audioService.tryResumeContext()}
      onTouchStart={() => audioService.tryResumeContext()}
    >
      <ForcedLandscape>
        {showSplash && (
          <SplashScreen
            onStart={() => audioService.init()}
            complete={audioReady}
            onDone={() => setShowSplash(false)}
          />
        )}

        {!showSplash && <LandscapeLayout {...layoutProps} />}

        {!showSplash && currentScreen === 'matching' && (
          <MatchingScreen
            onGameStart={handleMultiplayerGameStart}
            onBack={() => { setShowTitle(true); setCurrentScreen('title'); }}
            onOpenSettings={() => setShowSettings(true)}
          />
        )}

        {!showSplash && showTitle && (
          <TitleScreen
            key={titleKey}
            version={version}
            onStartSingle={() => handleStartGame('SINGLE')}
            onStartCpu={handleStartCpu}
            onStartMulti={() => { setShowTitle(false); setCurrentScreen('matching'); }}
            onOpenSettings={() => setShowSettings(true)}
          />
        )}

        {showCpuLevel && (
          <CpuLevelSelectModal
            onSelect={handleCpuLevelSelected}
            onCancel={handleCpuLevelCancel}
            bestTimes={cpuBestTimes}
          />
        )}

        {showSettings && (
          <SettingsModal
            onClose={() => setShowSettings(false)}
            bgmOn={bgmOn} seOn={seOn}
            onBgmToggle={handleBgmToggle} onSeToggle={handleSeToggle}
            mapping={mapping} isRemapping={isRemapping} remapAction={remapAction}
            startRemap={startRemap} cancelRemap={cancelRemap} resetMapping={resetMapping}
          />
        )}
      </ForcedLandscape>
    </div>
  );
}

export default App;
