import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTetrisGame } from './hooks/useTetrisGame';
import { useGameInput } from './hooks/useGameInput';
import TetrisBoard from './components/TetrisBoard';
import { ControlButton } from './components/Button';
import { Pause, Play } from 'lucide-react';
import { audioService } from './services/audioService';
import { MultiPlayer } from './types';

import { NextQueueItem, MiniPieceIcon } from './components/game/PieceDisplay';
import { DPad, ActionButtons } from './components/game/Controller';
import { CpuStatusDisplay } from './components/game/CpuStatus';
import Overlays from './components/ui/Overlays';
import SettingsModal from './components/ui/SettingsModal';
import TitleScreen from './components/ui/TitleScreen';
import { MatchingScreen } from './components/vsmulti/MatchingScreen';
import SplashScreen from './components/ui/SplashScreen';
import { multiplayerService } from './services/multiplayerService';

const version = "1.46";

function App() {
  const [currentScreen, setCurrentScreen] = useState('title');
  const [showTitle, setShowTitle]         = useState(true);
  const [showSettings, setShowSettings]   = useState(false);
  const [bgmOn, setBgmOn]                 = useState(true);
  const [seOn,  setSeOn]                  = useState(true);
  const [blinkDuration, setBlinkDuration] = useState('2s');
  
  const [showSplash, setShowSplash]       = useState(true);
  const [audioReady, setAudioReady]       = useState(false);

  const {
    grid, activePiece, activeShape, position, ghostPosition,
    nextQueue, holdPiece, score, lines, level,
    gameOver, isWinner, paused, gameStarted, clearingRows, specialMessage,
    gameMode, cpuHealth, nextAttackTime, playerAttack, pendingGarbage,
    move, rotate, rotateCCW, hardDrop, hold, togglePause, resetGame, quitGame,
    setIsWinner, setGameOver
  } = useTetrisGame();

  const [multiPlayers, setMultiPlayers] = useState<MultiPlayer[]>([]);

  const { mapping, isRemapping, remapAction, startRemap, cancelRemap, resetMapping } = useGameInput(
    { move, rotate, rotateCCW, hardDrop, hold, togglePause },
    gameStarted && !showSettings,
    paused,
    gameOver,
  );

  // --- Audio ---
  const handleBgmToggle = (on: boolean) => { setBgmOn(on); audioService.setBgmEnabled(on); };
  const handleSeToggle  = (on: boolean) => { setSeOn(on);  audioService.setSeEnabled(on);  };

  useEffect(() => {
    audioService.setOnReady(() => setAudioReady(true));
    // マルチプレイのグローバル監視
    multiplayerService.addListener(setMultiPlayers);
    return () => multiplayerService.removeListener(setMultiPlayers);
  }, []);

  const handleSplashDone = useCallback(() => {
    setShowSplash(false);
  }, []);

  const handleAudioInit = useCallback(() => {
    audioService.init();
  }, []);

  useEffect(() => {
    if (showTitle || currentScreen === 'matching') {
      if (audioReady) audioService.startBGM('title');
    } else if (gameStarted && !gameOver && !isWinner) {
      if (paused) {
        audioService.pauseBGM?.();
      } else {
        if (audioService.getBgmIsPaused?.()) {
          audioService.resumeBGM?.();
        } else {
          audioService.startBGM('game');
        }
      }
    } else if (isWinner) {
      audioService.startBGM('win');
    } else if (!gameOver && !isWinner) {
      audioService.stopBGM();
    }
  }, [showTitle, showSplash, audioReady, currentScreen, gameStarted, paused, gameOver, isWinner]);

  useEffect(() => {
    if (audioReady && showSplash) {
      const timer = setTimeout(() => {
        if (showSplash) setShowSplash(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [audioReady, showSplash]);

  // --- Page Visibility / Focus ---
  useEffect(() => {
    const handleInactivate = () => {
      audioService.pauseBGM();
      if (currentScreen === 'game' && gameStarted && !gameOver && !isWinner && !paused) {
        togglePause();
      }
    };
    const handleActivate = () => {
      if (showTitle || (currentScreen === 'game' && !paused)) {
        audioService.resumeBGM();
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') handleInactivate();
      else handleActivate();
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleInactivate);
    window.addEventListener('focus', handleActivate);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleInactivate);
      window.removeEventListener('focus', handleActivate);
    };
  }, [currentScreen, gameStarted, gameOver, isWinner, paused, showTitle, togglePause]);

  // --- CPU blink ---
  useEffect(() => {
    if (!gameStarted || gameMode !== 'CPU' || paused || isWinner) return;
    const id = setInterval(() => {
      const diff = nextAttackTime - Date.now();
      const d = diff < 1000 ? '0.15s' : diff < 3000 ? '0.5s' : '2s';
      setBlinkDuration(cur => cur === d ? cur : d);
    }, 200);
    return () => clearInterval(id);
  }, [nextAttackTime, gameStarted, gameMode, paused, isWinner]);

  useEffect(() => {
    // MULTIモードでのみ動作。gameStartedが同時にfalseになるため!gameStartedガードは置かない
    if (gameMode !== 'MULTI') return;

    const myId = multiplayerService.getPlayerId();

    // 自分が負けた場合
    if (gameOver) {
      console.log(`[App] Game Over detected in MULTI mode. Updating status to defeated.`);
      multiplayerService.updateStatus('defeated');
    }

    // 相手の状態を監視
    const opponent = multiPlayers.find(p => p.id !== myId);
    
    if (multiPlayers.length > 1) {
      // ログが多すぎないよう、相手がdefeatedになった時か初回のみ出すのが理想だがデバッグのため継続
      // console.log(`[App] MultiPlay Status: Me=${myId}, Opponent=${opponent?.id}, OppStatus=${opponent?.status}`);
    }

    if (opponent && opponent.status === 'defeated' && !gameOver && !isWinner) {
      console.log(`[App] Opponent ${opponent.id} defeated. Setting isWinner to true.`);
      setIsWinner(true);
    }
  }, [multiPlayers, gameOver, isWinner, gameStarted, gameMode, setIsWinner]);

  // --- Navigation ---
  const handleStartGame = useCallback((mode: 'SINGLE' | 'CPU') => {
    audioService.stopAll();
    setShowTitle(false);
    setCurrentScreen('game');
    resetGame(mode);
  }, [resetGame]);

  const handleMultiplayerGameStart = useCallback((_roomId: string, _players: MultiPlayer[]) => {
    audioService.stopAll(); 
    setCurrentScreen('game'); 
    resetGame('MULTI');
    multiplayerService.updateStatus('playing');
  }, [resetGame]);

  const handleQuitToTitle = useCallback(() => {
    audioService.stopAll();
    if (gameMode === 'MULTI') multiplayerService.leaveRoom();
    quitGame();
    setShowTitle(true);
    setCurrentScreen('title');
  }, [gameMode, quitGame]);

  const handleRetry = useCallback(() => {
    audioService.stopAll(); 
    if (gameMode === 'MULTI') {
      multiplayerService.updateStatus('found');
      setCurrentScreen('matching');
      // 重要: マルチ時は自動開始せずにリセットのみ（カウントダウン待機）
      resetGame('MULTI', false);
    } else {
      resetGame();
    }
  }, [gameMode, resetGame]);

  const overlayProps = {
    playerAttack, gameOver, isWinner, paused, gameStarted, score,
    bgmOn, seOn, onBgmToggle: handleBgmToggle, onSeToggle: handleSeToggle,
    onResume: togglePause, onRetry: handleRetry, onQuitToTitle: handleQuitToTitle,
  };

  const handleGlobalInteraction = () => {
    audioService.tryResumeContext();
  };

  return (
    <div 
      className="h-[100dvh] bg-neutral-950 text-white overflow-hidden font-sans select-none touch-none"
      onClick={handleGlobalInteraction}
      onTouchStart={handleGlobalInteraction}
    >
      {showSplash && (
        <SplashScreen 
          onStart={handleAudioInit} 
          complete={audioReady} 
          onDone={handleSplashDone} 
        />
      )}

      {/* Portrait Layout */}
      {!showSplash && (
        <div className="w-full h-full flex flex-col items-center landscape:hidden relative z-0">
          <div className="w-full max-w-lg px-4 py-1 flex justify-between items-center bg-neutral-900 border-b border-neutral-800 z-10 shrink-0 h-10">
            <div className="flex items-baseline">
              <h1 className="text-sm font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">NEON 99</h1>
              <span className="text-xs text-gray-400 ml-2">v{version}</span>
            </div>
            <div className="flex gap-4 font-mono text-xs">
              <div>LVL <span className="text-yellow-400">{level}</span></div>
              <div>LINES <span className="text-green-400">{lines}</span></div>
              <div>SCORE <span className="text-white">{score}</span></div>
            </div>
          </div>

          <div className="flex-1 w-full max-w-lg flex items-start justify-center pt-2 pb-0 gap-1 min-h-0 relative">
            <div className="flex flex-col items-center justify-start pt-4 w-16">
              <div className="text-[10px] text-gray-500 font-bold mb-1">HOLD</div>
              <div className="w-14 h-14 bg-black border-2 border-gray-700 rounded flex items-center justify-center">
                <MiniPieceIcon type={holdPiece} />
              </div>
              <div className="mt-8">
                <ControlButton onClick={togglePause} className="w-10 h-10 rounded-full border border-gray-600 bg-gray-800 text-gray-400 active:bg-gray-700 flex items-center justify-center" cooldown={200}>
                  {paused ? <Play size={16} /> : <Pause size={16} />}
                </ControlButton>
              </div>
            </div>

            <div className="relative shrink-0">
              <TetrisBoard grid={grid} activeShape={activeShape} position={position} activePiece={activePiece} clearingRows={clearingRows} specialMessage={specialMessage} ghostPosition={ghostPosition} />
              <Overlays {...overlayProps} />
            </div>

            <div className="flex flex-col items-center justify-between pt-4 pb-2 w-16 h-full">
              <div className="flex flex-col items-center">
                <div className="text-[10px] text-gray-500 font-bold mb-1">NEXT</div>
                <div className="flex flex-col gap-1">
                  {nextQueue.slice(0, 3).map((type, i) => <NextQueueItem key={i} type={type} index={i} />)}
                </div>
              </div>
              {gameMode === 'CPU' && gameStarted && (
                <div className="mb-10">
                  <CpuStatusDisplay cpuHealth={cpuHealth} pendingGarbage={pendingGarbage} blinkDuration={blinkDuration} vertical={true} />
                </div>
              )}
            </div>
          </div>

          <div className="w-full max-w-lg shrink-0 z-10 touch-none"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)', paddingLeft: '8px', paddingRight: '8px', paddingTop: '6px' }}>
            <div className="flex justify-between items-end">
              <DPad move={move} hardDrop={hardDrop} />
              <ActionButtons hold={hold} rotate={rotate} rotateCCW={rotateCCW} />
            </div>
          </div>
        </div>
      )}

      {/* Landscape Layout */}
      {!showSplash && (
        <div className="hidden landscape:flex w-full h-full flex-row overflow-hidden relative z-0">
          <div className="flex-1 flex flex-col items-center justify-between pb-1 pt-2 gap-2 bg-gray-900/20 border-r border-gray-800/50 min-w-0">
            <div className="mt-2 flex items-baseline">
              <h1 className="text-xs font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">NEON 99</h1>
              <span className="text-xs text-gray-500 ml-1.5">v{version}</span>
            </div>
            <div className="mb-2">
              <DPad move={move} hardDrop={hardDrop} />
            </div>
          </div>

          <div className="shrink-0 h-full flex items-center justify-center gap-2 px-2">
            <div className="flex flex-col items-center gap-2 w-12">
              <div className="text-[8px] text-gray-500 font-bold">HOLD</div>
              <div className="w-12 h-12 bg-black border-2 border-gray-700 rounded flex items-center justify-center">
                <MiniPieceIcon type={holdPiece} />
              </div>
              <ControlButton onClick={togglePause} className="w-8 h-8 mt-2 rounded-full border border-gray-600 bg-gray-800 text-gray-400 active:bg-gray-700 flex items-center justify-center" cooldown={200}>
                {paused ? <Play size={12} /> : <Pause size={12} />} 
              </ControlButton>
            </div>

            <div className="relative h-[94vh] aspect-[1/2] shadow-2xl">
              <TetrisBoard grid={grid} activeShape={activeShape} position={position} activePiece={activePiece} clearingRows={clearingRows} specialMessage={specialMessage} ghostPosition={ghostPosition} style={{ width: '100%', height: '100%' }} />
              <Overlays {...overlayProps} />
            </div>

            <div className="flex flex-col items-center justify-between mt-8 mb-4 w-12 h-full py-4">
              <div className="flex flex-col items-center gap-2">
                <div className="text-[8px] text-gray-500 font-bold">NEXT</div>
                <div className="flex flex-col gap-1">
                  {nextQueue.slice(0, 3).map((type, i) => <NextQueueItem key={i} type={type} index={i} />)}
                </div>
              </div>
              {gameMode === 'CPU' && gameStarted && (
                <CpuStatusDisplay cpuHealth={cpuHealth} pendingGarbage={pendingGarbage} blinkDuration={blinkDuration} vertical={false} />
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-between pb-8 pt-2 gap-2 bg-gray-900/20 border-l border-gray-800/50 min-w-0">
            <div className="flex flex-col items-center gap-2 transform scale-90 origin-top mt-2">
              <div className="bg-gray-900 px-4 py-2 rounded border border-gray-800 font-mono text-xs text-center w-32">
                SCORE <span className="text-white block text-xl">{score}</span>
              </div>
              <div className="flex gap-2">
                <div className="bg-gray-900 px-2 py-1 rounded border border-gray-800 whitespace-nowrap text-[10px] w-14 text-center">LVL <span className="text-yellow-400 block text-sm">{level}</span></div>
                <div className="bg-gray-900 px-2 py-1 rounded border border-gray-800 whitespace-nowrap text-[10px] w-14 text-center">LINES <span className="text-green-400 block text-sm">{lines}</span></div>
              </div>
            </div>
            <div className="mb-2">
              <ActionButtons hold={hold} rotate={rotate} rotateCCW={rotateCCW} />
            </div>
          </div>
        </div>
      )}

      {/* Matching Screen */}
      {currentScreen === 'matching' && (
        <MatchingScreen
          onGameStart={handleMultiplayerGameStart}
          onBack={() => { setShowTitle(true); setCurrentScreen('title'); }}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* Title Screen */}
      {showTitle && !showSplash && (
        <TitleScreen
          version={version}
          onStartSingle={() => handleStartGame('SINGLE')}
          onStartCpu={() => handleStartGame('CPU')}
          onStartMulti={() => { setShowTitle(false); setCurrentScreen('matching'); }}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* Settings Modal */}
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
