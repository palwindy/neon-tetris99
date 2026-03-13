import React from 'react';
import { ControlButton } from '../Button';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCw, RotateCcw } from 'lucide-react';

interface DPadProps {
  move: (dir: { x: number; y: number }) => void;
  hardDrop: () => void;
}

export const DPad: React.FC<DPadProps> = React.memo(({ move, hardDrop }) => {
  const btn = "flex items-center justify-center bg-gray-800 border-b-4 border-gray-950 active:border-b-0 active:translate-y-0.5 shadow-md touch-none select-none";
  const s = "clamp(52px, 14vw, 72px)";
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `${s} ${s} ${s}`, gridTemplateRows: `${s} ${s} ${s}`, gap: '3px' }}>
      <div />
      <ControlButton onAction={hardDrop} repeat={false} cooldown={500} className={`${btn} rounded-t-xl rounded-b-sm`} style={{ width: s, height: s }}>
        <ArrowUp style={{ width: 'clamp(20px, 5vw, 28px)', height: 'clamp(20px, 5vw, 28px)' }} className="text-cyan-400" />
      </ControlButton>
      <div />
      <ControlButton onAction={() => move({ x: -1, y: 0 })} repeat={true} repeatDelay={300} repeatInterval={150} className={`${btn} rounded-l-xl rounded-r-sm`} style={{ width: s, height: s }}>
        <ArrowLeft style={{ width: 'clamp(20px, 5vw, 28px)', height: 'clamp(20px, 5vw, 28px)' }} />
      </ControlButton>
      <div className="bg-gray-800 rounded-md" style={{ width: s, height: s }} />
      <ControlButton onAction={() => move({ x: 1, y: 0 })} repeat={true} repeatDelay={300} repeatInterval={150} className={`${btn} rounded-r-xl rounded-l-sm`} style={{ width: s, height: s }}>
        <ArrowRight style={{ width: 'clamp(20px, 5vw, 28px)', height: 'clamp(20px, 5vw, 28px)' }} />
      </ControlButton>
      <div />
      <ControlButton onAction={() => move({ x: 0, y: 1 })} repeat={true} repeatDelay={200} repeatInterval={100} className={`${btn} rounded-b-xl rounded-t-sm`} style={{ width: s, height: s }}>
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

export const ActionButtons: React.FC<ActionButtonsProps> = React.memo(({ hold, rotate, rotateCCW }) => {
  const s      = "clamp(52px, 14vw, 72px)";
  const sLarge = "clamp(62px, 17vw, 86px)";
  const sSmall = "clamp(42px, 11vw, 56px)";
  const btnBase = "rounded-full border-b-4 active:border-b-0 active:translate-y-0.5 shadow-md flex flex-col items-center justify-center touch-none select-none";

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(14px, 4vw, 24px)', marginBottom: 'clamp(10px, 3vw, 20px)' }}>

      {/* 左カラム: HOLD（上）→ CCW（下） */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(6px, 1.5vw, 10px)' }}>
        <ControlButton onClick={hold} cooldown={200}
          className={`${btnBase} border-gray-700 bg-gray-600 text-gray-200`}
          style={{ width: sSmall, height: sSmall }}>
          <span style={{ fontSize: 'clamp(8px, 2.2vw, 11px)', fontWeight: 'bold' }}>HOLD</span>
        </ControlButton>
        <ControlButton onAction={rotateCCW} cooldown={0}
          className={`${btnBase} border-pink-900 bg-pink-700 text-white`}
          style={{ width: s, height: s }}>
          <RotateCcw style={{ width: 'clamp(18px, 4.5vw, 26px)', height: 'clamp(18px, 4.5vw, 26px)' }} />
          <span style={{ fontSize: 'clamp(7px, 2vw, 10px)', fontWeight: 'bold', opacity: 0.8 }}>CCW</span>
        </ControlButton>
      </div>

      {/* 右カラム: CW（縦中央） */}
      <ControlButton onAction={rotate} cooldown={0}
        className={`${btnBase} border-purple-800 bg-purple-600 text-white`}
        style={{ width: sLarge, height: sLarge }}>
        <RotateCw style={{ width: 'clamp(22px, 5.5vw, 32px)', height: 'clamp(22px, 5.5vw, 32px)' }} />
        <span style={{ fontSize: 'clamp(8px, 2.2vw, 11px)', fontWeight: 'bold', opacity: 0.8 }}>CW</span>
      </ControlButton>

    </div>
  );
});
