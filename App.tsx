
import React, { useEffect, useState } from 'react';
import { useTetrisGame } from './hooks/useTetrisGame';
import { useGameInput } from './hooks/useGameInput';
import TetrisBoard from './components/TetrisBoard';
import { ControlButton } from './components/Button';
import { TETROMINOS, COLOR_MAP } from './constants';
import { RotateCw, RotateCcw, ArrowDown, ArrowUp, ArrowLeft, ArrowRight, Pause, Play, Home, Gamepad2, Settings, X, RotateCcw as ResetIcon, User, Users, Bot, Trophy, Skull, Music, Zap } from 'lucide-react';
import { audioService } from './services/audioService';
import { ControllerAction, MultiPlayer } from './types';
import { MatchingScreen } from './components/vsmulti/MatchingScreen';

interface NextQueueItemProps {
  type: string | null;
  index: number;
}

const NextQueueItem: React.FC<NextQueueItemProps> = ({ type, index }) => {
  if (!type) return null;
  const piece = TETROMINOS[type as any];
  const scale = index === 0 ? 1 : 0.8;
  const opacity = index === 0 ? 1 : 0.6;
  
  return (
    <div className="flex flex-col items-center mb-1" style={{ transform: `scale(${scale})`, opacity }}>
      <div className="w-12 h-10 flex items-center justify-center bg-gray-900/50 rounded border border-gray-800">
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${piece.shape[0].length}, 1fr)`, gap: '2px' }}>
          {piece.shape.map((row, y) => row.map((cell, x) => (
             cell ? (
              <div 
                key={`${x}-${y}`} 
                className="w-2 h-2 rounded-[1px]" 
                style={{ backgroundColor: COLOR_MAP[piece.color] }} 
              />
             ) : <div key={`${x}-${y}`} className="w-2 h-2" />
          )))}
        </div>
      </div>
    </div>
  );
};

interface MiniPieceIconProps {
  type: string | null;
}

const MiniPieceIcon: React.FC<MiniPieceIconProps> = ({ type }) => {
  if (!type) return <span className="font-bold text-[8px] text-gray-500">EMPTY</span>;
  const piece = TETROMINOS[type as any];
  const cols = piece.shape[0].length;
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '1px' }}>
       {piece.shape.map((row, y) => row.map((cell, x) => (
         cell ? (
          <div 
            key={`${x}-${y}`} 
            className="w-1.5 h-1.5 rounded-[0.5px]" 
            style={{ backgroundColor: COLOR_MAP[piece.color] }} 
          />
         ) : <div key={`${x}-${y}`} className="w-1.5 h-1.5" />
      )))}
    </div>
  );
};

// --- Visual Effects Components ---

const VictoryConfetti = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
    {[...Array(50)].map((_, i) => (
      <div 
        key={i}
        className="absolute -top-4 w-2 h-2 rounded-sm animate-fall"
        style={{
          left: `${Math.random() * 100}%`,
          backgroundColor: ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f'][Math.floor(Math.random() * 6)],
          animationDuration: `${2 + Math.random() * 3}s`,
          animationDelay: `${Math.random() * 2}s`
        }}
      />
    ))}
    <style>{`
      @keyframes fall {
        0% { transform: translateY(-10%) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
      .animate-fall { animation-name: fall; animation-timing-function: linear; animation-iteration-count: infinite; }
    `}</style>
  </div>
);

const PlayerAttackEffect: React.FC<{ damage: number }> = ({ damage }) => {
  return (
    <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-1 bg-cyan-400 shadow-[0_0_20px_#0ff] animate-attack-beam origin-left"></div>
       <div className="absolute top-1/2 right-10 -translate-y-1/2 text-4xl font-black italic text-cyan-200 drop-shadow-[0_0_10px_cyan] animate-damage-pop">
         -{damage}
       </div>
       <style>{`
          @keyframes attack-beam {
             0% { transform: translate(-50%, -50%) scaleX(0); opacity: 1; }
             50% { transform: translate(-50%, -50%) scaleX(1); opacity: 1; }
             100% { transform: translate(-50%, -50%) scaleX(2); opacity: 0; }
          }
          @keyframes damage-pop {
             0% { transform: translateY(0) scale(0.5); opacity: 0; }
             50% { transform: translateY(-20px) scale(1.5); opacity: 1; }
             100% { transform: translateY(-40px) scale(1); opacity: 0; }
          }
          .animate-attack-beam { animation: attack-beam 0.4s ease-out forwards; }
          .animate-damage-pop { animation: damage-pop 0.8s ease-out forwards; }
       `}</style>
    </div>
  );
};

// --- Controller Components ---

interface DPadProps {
  move: (dir: { x: number; y: number }) => void;
  hardDrop: () => void;
}

const DPad: React.FC<DPadProps> = React.memo(({ move, hardDrop }) => {
  const btn = "flex items-center justify-center bg-gray-800 border-b-4 border-gray-950 active:border-b-0 active:translate-y-0.5 shadow-md touch-none select-none";
  const s = "clamp(52px, 14vw, 72px)";
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `${s} ${s} ${s}`, gridTemplateRows: `${s} ${s} ${s}`, gap: '3px' }}>
      <div />
      <ControlButton onAction={hardDrop} repeat={false} cooldown={500}
        className={`${btn} rounded-t-xl rounded-b-sm`} style={{ width: s, height: s }}>
        <ArrowUp style={{ width: 'clamp(20px, 5vw, 28px)', height: 'clamp(20px, 5vw, 28px)' }} className="text-cyan-400" />
      </ControlButton>
      <div />
      <ControlButton onAction={() => move({ x: -1, y: 0 })} repeat={true} repeatDelay={300} repeatInterval={150}
        className={`${btn} rounded-l-xl rounded-r-sm`} style={{ width: s, height: s }}>
        <ArrowLeft style={{ width: 'clamp(20px, 5vw, 28px)', height: 'clamp(20px, 5vw, 28px)' }} />
      </ControlButton>
      <div className="bg-gray-800 rounded-md" style={{ width: s, height: s }} />
      <ControlButton onAction={() => move({ x: 1, y: 0 })} repeat={true} repeatDelay={300} repeatInterval={150}
        className={`${btn} rounded-r-xl rounded-l-sm`} style={{ width: s, height: s }}>
        <ArrowRight style={{ width: 'clamp(20px, 5vw, 28px)', height: 'clamp(20px, 5vw, 28px)' }} />
      </ControlButton>
      <div />
      <ControlButton onAction={() => move({ x: 0, y: 1 })} repeat={true} repeatDelay={200} repeatInterval={100}
        className={`${btn} rounded-b-xl rounded-t-sm`} style={{ width: s, height: s }}>
        <ArrowDown style={{ width: 'clamp(20px, 5vw, 28px)', height: 'clamp(20px, 5vw, 28px)' }} />
      </ControlButton>
      <div />
    </div>
  );
});

interface ActionButtonsProps {
  hold: () => void;
  rotate: () => void;
  rotateCCW: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = React.memo(({ hold, rotate, rotateCCW }) => {
  const s      = "clamp(52px, 14vw, 72px)";
  const sLarge = "clamp(62px, 17vw, 86px)";
  const sSmall = "clamp(42px, 11vw, 56px)";
  return (
    <div className="flex flex-col items-end gap-2">
      <ControlButton onClick={hold} cooldown={200}
        className="rounded-full border-b-4 border-gray-700 bg-gray-600 text-gray-200 active:border-b-0 active:translate-y-0.5 shadow-md flex flex-col items-center justify-center touch-none select-none"
        style={{ width: sSmall, height: sSmall }}>
        <span style={{ fontSize: 'clamp(8px, 2.2vw, 11px)', fontWeight: 'bold' }}>HOLD</span>
      </ControlButton>
      <div className="flex items-end gap-2">
        <ControlButton onAction={rotateCCW} cooldown={0}
          className="rounded-full border-b-4 border-pink-900 bg-pink-700 text-white active:border-b-0 active:translate-y-0.5 shadow-md flex flex-col items-center justify-center touch-none select-none"
          style={{ width: s, height: s }}>
          <RotateCcw style={{ width: 'clamp(18px, 4.5vw, 26px)', height: 'clamp(18px, 4.5vw, 26px)' }} />
          <span style={{ fontSize: 'clamp(7px, 2vw, 10px)', fontWeight: 'bold', opacity: 0.8 }}>CCW</span>
        </ControlButton>
        <ControlButton onAction={rotate} cooldown={0}
          className="rounded-full border-b-4 border-purple-800 bg-purple-600 text-white active:border-b-0 active:translate-y-0.5 shadow-md flex flex-col items-center justify-center touch-none select-none"
          style={{ width: sLarge, height: sLarge }}>
          <RotateCw style={{ width: 'clamp(22px, 5.5vw, 32px)', height: 'clamp(22px, 5.5vw, 32px)' }} />
          <span style={{ fontSize: 'clamp(8px, 2.2vw, 11px)', fontWeight: 'bold', opacity: 0.8 }}>CW</span>
        </ControlButton>
      </div>
    </div>
  );
});

// --- Main App ---

function App() {
  const version = "1.08";
  const [currentScreen, setCurrentScreen] = useState('title');
  const [showTitle, setShowTitle] = useState(true);
  
  const {
    grid, activePiece, activeShape, position, ghostPosition,
    nextQueue, holdPiece, score, lines, level, combo,
    gameOver, isWinner, paused, gameStarted, clearingRows, specialMessage,
    gameMode, cpuHealth, nextAttackTime, playerAttack, pendingGarbage,
    move, rotate, rotateCCW, hardDrop, hold, togglePause, resetGame, quitGame
  } = useTetrisGame();

  const [showSettings, setShowSettings] = useState(false);
  const [bgmOn, setBgmOn] = useState(true);
  const [seOn,  setSeOn]  = useState(true);
  const [blinkDuration, setBlinkDuration] = useState('2s');
  
  const handleBgmToggle = (on: boolean) => {
    setBgmOn(on);
    audioService.setBgmEnabled(on);
  };

  const handleSeToggle = (on: boolean) => {
    setSeOn(on);
    audioService.setSeEnabled(on);
  };

  // Hook up inputs (Keyboard + Gamepad)
  const { mapping, isRemapping, remapAction, startRemap, cancelRemap, resetMapping } = useGameInput(
    { move, rotate, rotateCCW, hardDrop, hold, togglePause },
    gameStarted && !showSettings,
    paused,
    gameOver
  );

  useEffect(() => {
    if (showTitle) {
      audioService.startBGM('title');
    } else if (gameStarted && !paused && !gameOver && !isWinner) {
      audioService.startBGM('game');
    } else if (gameOver || isWinner) {
      // Game over/win sounds are handled by the hook, so do nothing here.
    } else {
      audioService.stopBGM();
    }
  }, [showTitle, gameStarted, paused, gameOver, isWinner]);

  // Attack Warning Blink Speed Logic
  useEffect(() => {
    if (!gameStarted || gameMode !== 'CPU' || paused || isWinner) return;
    
    const updateBlink = () => {
        const now = Date.now();
        const diff = nextAttackTime - now;
        let newDuration = '2s';
        if (diff < 1000) newDuration = '0.15s';
        else if (diff < 3000) newDuration = '0.5s';
        setBlinkDuration(current => current === newDuration ? current : newDuration);
    };

    const interval = setInterval(updateBlink, 200);
    return () => clearInterval(interval);
  }, [nextAttackTime, gameStarted, gameMode, paused, isWinner]);
  
  const handleStartGame = (mode: 'SINGLE' | 'CPU') => {
    audioService.stopAll();
    setShowTitle(false);
    resetGame(mode);
  };
  
  const handleMultiplayerGameStart = (roomId: string, players: MultiPlayer[]) => {
    audioService.stopAll();
    setCurrentScreen('game');
    resetGame('MULTI');
  };

  const handleQuitToTitle = () => {
    audioService.stopAll();
    quitGame();
    setShowTitle(true);
  };

  const SettingsModal = () => (
    <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center z-50 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md flex flex-col h-full">
        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-2">
          <h2 className="text-xl font-bold flex items-center gap-2 text-cyan-400">
            <Gamepad2 /> Controller Settings
          </h2>
          <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-800 rounded-full">
            <X className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
           {/* Audio Settings */}
            <div className="mb-4 pb-4 border-b border-gray-800">
              <p className="text-xs text-gray-500 font-bold tracking-widest mb-3 uppercase">Audio</p>
              <div className="flex flex-col gap-3">
                <label className="flex items-center justify-between bg-gray-900 p-3 rounded border border-gray-800 cursor-pointer select-none">
                  <span className="text-gray-300 text-sm flex items-center gap-2">
                    <Music size={15} className="text-cyan-400" /> BGM
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={bgmOn}
                      onChange={e => handleBgmToggle(e.target.checked)}
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${bgmOn ? 'bg-cyan-500' : 'bg-gray-700'}`} />
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${bgmOn ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </label>
                <label className="flex items-center justify-between bg-gray-900 p-3 rounded border border-gray-800 cursor-pointer select-none">
                  <span className="text-gray-300 text-sm flex items-center gap-2">
                    <Zap size={15} className="text-yellow-400" /> SE
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={seOn}
                      onChange={e => handleSeToggle(e.target.checked)}
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${seOn ? 'bg-cyan-500' : 'bg-gray-700'}`} />
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${seOn ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </label>
              </div>
            </div>

           {isRemapping && (
             <div className="mb-4 p-4 bg-purple-900/50 border border-purple-500 rounded-lg text-center animate-pulse">
               <p className="font-bold text-white mb-1">Waiting for input...</p>
               <p className="text-sm text-purple-200">Press button for {remapAction}</p>
               <button onClick={cancelRemap} className="mt-2 text-xs bg-black/30 px-3 py-1 rounded hover:bg-black/50">Cancel</button>
             </div>
           )}

           {(Object.keys(mapping) as ControllerAction[]).map((action) => (
             <div key={action} className="flex justify-between items-center bg-gray-900 p-3 rounded border border-gray-800">
                <span className="text-gray-300 font-mono text-sm">{action.replace('_', ' ')}</span>
                <button 
                  onClick={() => startRemap(action)}
                  disabled={isRemapping}
                  className="bg-gray-800 hover:bg-gray-700 text-cyan-400 px-4 py-1.5 rounded text-xs font-mono border border-gray-700 min-w-[80px]"
                >
                  BTN {mapping[action]}
                </button>
             </div>
           ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between">
            <button 
              onClick={resetMapping}
              className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm px-4 py-2"
            >
              <ResetIcon size={14} /> Reset Defaults
            </button>
            <button 
              onClick={() => setShowSettings(false)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-full"
            >
              Done
            </button>
        </div>
      </div>
    </div>
  );

  const TitleLogo = () => (
    <div className="mb-8 relative flex flex-col items-center">
      <h1 className="text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)] transform -skew-x-12">
        NEON
      </h1>
      <h1 className="text-6xl font-black italic tracking-tighter text-white transform -skew-x-12 -mt-4 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]">
        99
      </h1>
      <div className="absolute -inset-4 bg-purple-500/10 blur-3xl rounded-full -z-10 animate-pulse"></div>
    </div>
  );

  // CPU Display Component
  const CpuStatusDisplay = ({ vertical = true }) => {
    const isPanic = cpuHealth < 30;
    
    return (
      <div className={`flex ${vertical ? 'flex-col' : 'flex-col'} items-center animate-in slide-in-from-right duration-500 relative`}>
        <style>{`
          @keyframes panic-blink {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.6); opacity: 0.4; }
          }
        `}</style>
        
        <div className={`relative transition-transform ${isPanic ? 'animate-[shake_0.2s_ease-in-out_infinite]' : ''}`}>
           <div className={`w-12 h-12 ${isPanic ? 'bg-red-950 border-red-400' : 'bg-red-900/50 border-red-500'} rounded-full border-2 flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.5)] z-10 relative`}>
              {pendingGarbage > 0 ? (
                <span className="text-white font-black text-xl animate-pulse">{pendingGarbage}</span>
              ) : (
                isPanic ? <Skull className="text-white animate-pulse" size={24} /> : <Bot className="text-red-300" size={24} />
              )}
           </div>
           <div 
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border border-white"
              style={{ animation: `panic-blink ${blinkDuration} cubic-bezier(0, 0, 0.2, 1) infinite` }}
           ></div>
        </div>
        
        <div className={`mt-2 ${vertical ? 'w-2 h-24' : 'w-1.5 h-20'} bg-gray-800 rounded-full overflow-hidden border border-gray-700 relative`}>
           <div 
             className={`absolute bottom-0 w-full transition-all duration-300 ${isPanic ? 'bg-red-600' : 'bg-gradient-to-t from-red-600 to-yellow-500'}`}
             style={{ height: `${Math.max(0, Math.min(100, cpuHealth))}%` }}
           ></div>
        </div>
        <div className="text-[8px] font-mono mt-1 text-red-400">{Math.ceil(cpuHealth)}HP</div>
      </div>
    );
  }

  const Overlays = () => (
    <>
      {showSettings && <SettingsModal />}
      
      {playerAttack && (
         <PlayerAttackEffect key={playerAttack.id} damage={playerAttack.damage} />
      )}

      {gameOver && (
        <div className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center z-20 backdrop-blur-sm rounded-lg px-4">
          <h2 className="text-xl font-bold text-white mb-1">GAME OVER</h2>
          <div className="text-2xl font-mono text-white mb-4 break-all text-center">{score}</div>
          <button 
            onClick={() => { audioService.stopAll(); resetGame(); }}
            className="bg-white text-red-900 font-bold py-2 px-6 rounded-full shadow-lg active:scale-95"
          >
            RETRY
          </button>
          <button 
            onClick={handleQuitToTitle}
            className="mt-4 text-white/70 hover:text-white text-sm"
          >
            QUIT
          </button>
        </div>
      )}

      {isWinner && (
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/90 to-orange-700/90 flex flex-col items-center justify-center z-20 backdrop-blur-md rounded-lg px-4 overflow-hidden">
          <VictoryConfetti />
          <Trophy size={80} className="text-yellow-300 mb-4 animate-[bounce_1s_infinite]" />
          <h2 className="text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white to-yellow-200 mb-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">YOU WIN!</h2>
          <div className="text-xl font-mono text-white mb-8 bg-black/30 px-6 py-2 rounded-lg border border-white/20">Final Score: {score}</div>
          <button 
            onClick={() => { audioService.stopAll(); resetGame(); }}
            className="bg-white text-yellow-800 font-bold py-3 px-10 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.5)] active:scale-95 hover:scale-105 transition-transform z-20"
          >
            PLAY AGAIN
          </button>
          <button 
            onClick={handleQuitToTitle}
            className="mt-6 text-white/80 hover:text-white text-sm z-20 underline decoration-white/30"
          >
            RETURN TO MENU
          </button>
        </div>
      )}

      {paused && gameStarted && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-20 gap-2 backdrop-blur-sm px-4 rounded-lg">
          <h2 className="text-xl font-black italic tracking-widest text-white mb-1 border-b-2 border-cyan-500 pb-1">PAUSED</h2>
          <button 
            onClick={togglePause}
            className="w-full max-w-[180px] py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.5)] active:scale-95 flex items-center justify-center gap-2 border border-cyan-400 text-sm"
          >
            <Play size={16} fill="currentColor" /> RESUME
          </button>
          <button 
            onClick={() => { audioService.stopAll(); resetGame(); }}
            className="w-full max-w-[180px] py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg shadow-lg active:scale-95 flex items-center justify-center gap-2 border border-gray-600 text-sm"
          >
            <ResetIcon size={16} /> RETRY
          </button>
          <button 
            onClick={handleQuitToTitle}
            className="w-full max-w-[180px] py-2 bg-red-900/80 hover:bg-red-800 text-white font-bold rounded-lg shadow-lg active:scale-95 flex items-center justify-center gap-2 border border-red-700 text-sm"
          >
            <Home size={16} /> TITLE
          </button>
          
          {/* Audio toggles in pause */}
          <div className="w-full max-w-[180px] mt-1 pt-3 border-t border-gray-700 flex flex-col gap-2">
            <label className="flex items-center justify-between cursor-pointer select-none px-1">
              <span className="text-gray-400 text-xs flex items-center gap-1.5">
                <Music size={13} className="text-cyan-400" /> BGM
              </span>
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={bgmOn} onChange={e => handleBgmToggle(e.target.checked)} />
                <div className={`w-9 h-5 rounded-full transition-colors duration-200 ${bgmOn ? 'bg-cyan-500' : 'bg-gray-700'}`} />
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${bgmOn ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer select-none px-1">
              <span className="text-gray-400 text-xs flex items-center gap-1.5">
                <Zap size={13} className="text-yellow-400" /> SE
              </span>
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={seOn} onChange={e => handleSeToggle(e.target.checked)} />
                <div className={`w-9 h-5 rounded-full transition-colors duration-200 ${seOn ? 'bg-cyan-500' : 'bg-gray-700'}`} />
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${seOn ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </label>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="h-[100dvh] bg-neutral-950 text-white overflow-hidden font-sans select-none touch-none">
      
      {/* Portrait Layout */}
      <div className="w-full h-full flex flex-col items-center landscape:hidden">
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
             <div className="mt-8 flex flex-col items-center gap-2">
               <ControlButton 
                 onClick={togglePause} 
                 className="w-10 h-10 rounded-full border border-gray-600 bg-gray-800 text-gray-400 active:bg-gray-700 flex items-center justify-center"
                 cooldown={200}
               >
                 {paused ? <Play size={16} /> : <Pause size={16} />}
               </ControlButton>
             </div>
          </div>

          <div className="relative shrink-0">
            <TetrisBoard 
              grid={grid} activeShape={activeShape} position={position} activePiece={activePiece}
              clearingRows={clearingRows} specialMessage={specialMessage} ghostPosition={ghostPosition}
            />
            <Overlays />
          </div>

          <div className="flex flex-col items-center justify-between pt-4 pb-2 w-16 h-full">
            <div className="flex flex-col items-center">
              <div className="text-[10px] text-gray-500 font-bold mb-1">NEXT</div>
              <div className="flex flex-col gap-1">
                {nextQueue.slice(0, 3).map((type, i) => (
                  <NextQueueItem key={i} type={type} index={i} />
                ))}
              </div>
            </div>

            {gameMode === 'CPU' && gameStarted && (
              <div className="mb-10">
                 <CpuStatusDisplay vertical={true} />
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

      {/* Landscape Layout */}
      <div className="hidden landscape:flex w-full h-full flex-row overflow-hidden">
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
             <ControlButton 
                 onClick={togglePause} 
                 className="w-8 h-8 mt-2 rounded-full border border-gray-600 bg-gray-800 text-gray-400 active:bg-gray-700 flex items-center justify-center"
                 cooldown={200}
               >
                 {paused ? <Play size={12} /> : <Pause size={12} />}
             </ControlButton>
           </div>

           <div className="relative h-[94vh] aspect-[1/2] shadow-2xl">
              <TetrisBoard 
                grid={grid} activeShape={activeShape} position={position} activePiece={activePiece}
                clearingRows={clearingRows} specialMessage={specialMessage} ghostPosition={ghostPosition}
                style={{ width: '100%', height: '100%' }}
              />
              <Overlays />
           </div>

           <div className="flex flex-col items-center justify-between mt-8 mb-4 w-12 h-full py-4">
              <div className="flex flex-col items-center gap-2">
                <div className="text-[8px] text-gray-500 font-bold">NEXT</div>
                <div className="flex flex-col gap-1">
                  {nextQueue.slice(0, 3).map((type, i) => (
                    <NextQueueItem key={i} type={type} index={i} />
                  ))}
                </div>
              </div>

              {gameMode === 'CPU' && gameStarted && (
                 <CpuStatusDisplay vertical={false} />
              )}
           </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-between pb-8 pt-2 gap-2 bg-gray-900/20 border-l border-gray-800/50 min-w-0">
           <div className="flex flex-col items-center gap-2 transform scale-90 origin-top mt-2">
               <div className="bg-gray-900 px-4 py-2 rounded border border-gray-800 font-mono text-xs text-center w-32">
                  SCORE <span className="text-white block text-xl">{score}</span>
               </div>
               <div className="flex gap-2">
                   <div className="bg-gray-900 px-2 py-1 rounded border border-gray-800 whitespace-nowrap text-[10px] w-14 text-center">
                     LVL <span className="text-yellow-400 block text-sm">{level}</span>
                   </div>
                   <div className="bg-gray-900 px-2 py-1 rounded border border-gray-800 whitespace-nowrap text-[10px] w-14 text-center">
                     LINES <span className="text-green-400 block text-sm">{lines}</span>
                   </div>
               </div>
           </div>

           <div className="mb-2">
             <ActionButtons hold={hold} rotate={rotate} rotateCCW={rotateCCW} />
           </div>
        </div>

      </div>
      {currentScreen === 'matching' && <MatchingScreen onGameStart={handleMultiplayerGameStart} onBack={() => { setShowTitle(true); setCurrentScreen('title'); }} />}

      {/* Title Screen Overlay */}
      {showTitle && (
        <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col items-center justify-center"
          style={{ background: 'radial-gradient(ellipse at center, #1a0a2e 0%, #0a0a14 70%)' }}>

          <TitleLogo />

          <div className="flex flex-col gap-3 mb-6 w-full max-w-[260px] px-4">
            <button
              onClick={() => handleStartGame('SINGLE')}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-3 rounded-full shadow-[0_0_20px_rgba(147,51,234,0.5)] active:scale-95 text-lg tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <User size={20} /> SINGLE PLAY
            </button>

            <button
              onClick={() => handleStartGame('CPU')}
              className="w-full bg-gray-800/80 border border-gray-600 text-gray-300 font-bold py-2 rounded-full shadow-lg active:scale-95 tracking-wide hover:bg-gray-700 transition-all hover:text-white hover:border-gray-500 flex items-center justify-center gap-2"
            >
              <Bot size={18} /> VS CPU
            </button>

            <button
              onClick={() => { setShowTitle(false); setCurrentScreen('matching'); }}
              className="w-full bg-gray-800/80 border border-gray-600 text-gray-300 font-bold py-2 rounded-full shadow-lg active:scale-95 tracking-wide hover:bg-gray-700 transition-all hover:text-white hover:border-gray-500 flex items-center justify-center gap-2"
            >
              <Users size={18} /> VS MULTI
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowSettings(true)}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs py-2 px-4 rounded-lg border border-gray-600 flex items-center justify-center gap-2 active:scale-95 transition-colors"
            >
              <Settings size={14} /> CONFIG
            </button>
          </div>

          <p className="mt-6 text-[10px] text-gray-700 tracking-widest">v{version}</p>
        </div>
      )}
    </div>
  );
}

export default App;
