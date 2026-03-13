import React from 'react';

export const VictoryConfetti = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
    {[...Array(50)].map((_, i) => (
      <div
        key={i}
        className="absolute -top-4 w-2 h-2 rounded-sm animate-fall"
        style={{
          left: `${Math.random() * 100}%`,
          backgroundColor: ['#f00','#0f0','#00f','#ff0','#0ff','#f0f'][Math.floor(Math.random() * 6)],
          animationDuration: `${2 + Math.random() * 3}s`,
          animationDelay: `${Math.random() * 2}s`,
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

export const PlayerAttackEffect: React.FC<{ damage: number }> = ({ damage }) => (
  <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-1 bg-cyan-400 shadow-[0_0_20px_#0ff] animate-attack-beam origin-left"></div>
    <div className="absolute top-1/2 right-10 -translate-y-1/2 text-4xl font-black italic text-cyan-200 drop-shadow-[0_0_10px_cyan] animate-damage-pop">
      -{damage}
    </div>
    <style>{`
      @keyframes attack-beam {
        0% { transform: translate(-50%,-50%) scaleX(0); opacity:1; }
        50% { transform: translate(-50%,-50%) scaleX(1); opacity:1; }
        100% { transform: translate(-50%,-50%) scaleX(2); opacity:0; }
      }
      @keyframes damage-pop {
        0% { transform: translateY(0) scale(0.5); opacity:0; }
        50% { transform: translateY(-20px) scale(1.5); opacity:1; }
        100% { transform: translateY(-40px) scale(1); opacity:0; }
      }
      .animate-attack-beam { animation: attack-beam 0.4s ease-out forwards; }
      .animate-damage-pop  { animation: damage-pop 0.8s ease-out forwards; }
    `}</style>
  </div>
);
