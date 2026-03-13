import React, { useRef, useEffect } from 'react';

interface ButtonProps {
  onClick?: () => void;
  /** Primary action for the button */
  onAction?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  /** If true, the action repeats while held down */
  repeat?: boolean;
  /** Milliseconds before the first repeat triggers (DAS) */
  repeatDelay?: number;
  /** Milliseconds between repeats (ARR) */
  repeatInterval?: number;
  /** Milliseconds to wait before accepting another click (Cooldown) */
  cooldown?: number;
  style?: React.CSSProperties;
}

export const ControlButton: React.FC<ButtonProps> = ({ 
  onClick, 
  onAction, 
  children, 
  className = '', 
  disabled = false,
  repeat = false,
  repeatDelay = 200, 
  repeatInterval = 100,
  cooldown = 0,
  style
}) => {
  const isPressed = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lastActionTime = useRef<number>(0);
  
  // Keep track of the latest action callback to avoid stale closures
  const actionRef = useRef(onAction);
  const clickRef = useRef(onClick);

  useEffect(() => {
    actionRef.current = onAction;
    clickRef.current = onClick;
  }, [onAction, onClick]);

  // Unified action handler
  const triggerAction = () => {
    if (disabled) return;
    
    const now = Date.now();
    if (cooldown > 0 && now - lastActionTime.current < cooldown) {
      return;
    }
    lastActionTime.current = now;

    if (navigator.vibrate) navigator.vibrate(5); 
    if (actionRef.current) actionRef.current();
    if (clickRef.current) clickRef.current();
  };

  const clearTimers = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    // IMPORTANT: Prevent default on touch events to stop ghost mouse events (double input)
    // and prevent scrolling/zooming while playing
    if (e.type === 'touchstart' && e.cancelable) {
        e.preventDefault();
    }
    
    if (disabled) return;
    
    // Stop any existing timers
    clearTimers();

    isPressed.current = true;
    triggerAction(); 

    if (repeat) {
      timeoutRef.current = window.setTimeout(() => {
        if (isPressed.current) {
          intervalRef.current = window.setInterval(() => {
            if (isPressed.current) {
              triggerAction();
            }
          }, repeatInterval);
        }
      }, repeatDelay);
    }
  };

  const handleEnd = (e: React.TouchEvent | React.MouseEvent) => {
    // Prevent default on touchend to keep consistent behavior
    if (e.type === 'touchend' && e.cancelable) {
        e.preventDefault();
    }

    isPressed.current = false;
    clearTimers();
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  return (
    <button
      className={`relative select-none active:scale-95 transition-transform touch-none flex items-center justify-center ${className} ${disabled ? 'opacity-50' : ''}`}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onContextMenu={(e) => e.preventDefault()}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  );
};