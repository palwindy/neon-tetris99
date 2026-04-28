import React, { useEffect, useState, useCallback } from 'react';
import { useTetrisGame } from './hooks/useTetrisGame';
import { useGameInput } from './hooks/useGameInput';
import { useAppAudio } from './hooks/useAppAudio';
import { useMultiSync } from './hooks/useMultiSync';
import { useCountdown } from './hooks/useCountdown';
import { audioService } from './services/audioService';
import { multiplayerService } from './services/multiplayerService';
import { cpuOpponentManager } from './services/cpuOpponentManager';
import { MultiPlayer } from './types';

import { PortraitLayout } from './components/game/PortraitLayout';
import { LandscapeLayout } from './components/game/LandscapeLayout';
import SettingsModal from './components/ui/SettingsModal';
import TitleScreen from './components/ui/TitleScreen';
import { MatchingScreen } from './components/vsmulti/MatchingScreen';
import SplashScreen from './components/ui/SplashScreen';

const version = "5.00";

function App() {
  const [currentScreen, setCurrentScreen] = useState('title');
  const [showTitle,    setShowTitle]    = useState(true);
  const [showSplash,   setShowSplash]   = useState(true);
  const [showSettings, setShowSettings] = useState(false);

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

  // --- 画面遷移ハンドラ ---
  const handleStartGame = useCallback((mode: 'SINGLE' | 'CPU') => {
    setShowTitle(false);
    setCurrentScreen('game');
    runCountdownSequence(mode);
  }, [runCountdownSequence]);

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
      runCountdownSequence(gameMode);
    }
  }, [gameMode, runCountdownSequence, resetGame]);

  // --- レイアウト共通 props ---
  const overlayProps = {
    playerAttack, gameOver, isWinner, paused, gameStarted, score,
    bgmOn, seOn, onBgmToggle: handleBgmToggle, onSeToggle: handleSeToggle,
    onResume: togglePause, onRetry: handleRetry, onQuitToTitle: handleQuitToTitle,
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
      {showSplash && (
        <SplashScreen
          onStart={() => audioService.init()}
          complete={audioReady}
          onDone={() => setShowSplash(false)}
        />
      )}

      {!showSplash && <PortraitLayout  {...layoutProps} />}
      {!showSplash && <LandscapeLayout {...layoutProps} />}

      {currentScreen === 'matching' && (
        <MatchingScreen
          onGameStart={handleMultiplayerGameStart}
          onBack={() => { setShowTitle(true); setCurrentScreen('title'); }}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {showTitle && !showSplash && (
        <TitleScreen
          version={version}
          onStartSingle={() => handleStartGame('SINGLE')}
          onStartCpu={() => handleStartGame('CPU')}
          onStartMulti={() => { setShowTitle(false); setCurrentScreen('matching'); }}
          onOpenSettings={() => setShowSettings(true)}
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
    </div>
  );
}

export default App;
