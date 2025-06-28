import { useState, useEffect, useRef, useCallback } from 'react';

interface TurnTimerState {
  timeRemaining: number;
  isActive: boolean;
  hasExpired: boolean;
}

export function useTurnTimer(
  isMyTurn: boolean,
  turnStartTime?: number,
  turnTimeLimit: number = 30000, // 30 seconds in milliseconds
  onTurnExpired?: () => void
) {
  const [state, setState] = useState<TurnTimerState>({
    timeRemaining: turnTimeLimit,
    isActive: false,
    hasExpired: false
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasExpiredRef = useRef(false);

  const startTimer = useCallback((startTime?: number) => {
    const now = Date.now();
    const actualStartTime = startTime || now;
    const elapsed = now - actualStartTime;
    const remaining = Math.max(0, turnTimeLimit - elapsed);

    setState({
      timeRemaining: remaining,
      isActive: true,
      hasExpired: false
    });

    hasExpiredRef.current = false;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - actualStartTime;
      const remainingTime = Math.max(0, turnTimeLimit - elapsedTime);

      setState(prev => ({
        ...prev,
        timeRemaining: remainingTime
      }));

      if (remainingTime <= 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        setState(prev => ({
          ...prev,
          isActive: false,
          hasExpired: true
        }));
        
        if (onTurnExpired) {
          onTurnExpired();
        }
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 100); // Update every 100ms for smooth countdown
  }, [turnTimeLimit, onTurnExpired]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState({
      timeRemaining: turnTimeLimit,
      isActive: false,
      hasExpired: false
    });
    hasExpiredRef.current = false;
  }, [turnTimeLimit]);

  const resetTimer = useCallback((startTime?: number) => {
    stopTimer();
    if (isMyTurn) {
      startTimer(startTime);
    }
  }, [isMyTurn, startTimer, stopTimer]);

  // Start/stop timer based on turn state
  useEffect(() => {
    if (isMyTurn && turnStartTime) {
      startTimer(turnStartTime);
    } else {
      stopTimer();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isMyTurn, turnStartTime, startTimer, stopTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    ...state,
    resetTimer,
    stopTimer,
    progress: state.timeRemaining / turnTimeLimit, // 0 to 1
    formattedTime: Math.ceil(state.timeRemaining / 1000) // seconds remaining
  };
}