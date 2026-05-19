import { useState, useRef, useEffect, useCallback } from 'react';
import {
  IDLE_DELAY_MS,
  AUTO_DECREMENT_MS,
  RESET_STEP_MS,
  FAST_INCREMENT_MS,
  BONUS_EVERY_N,
  HISTORY_LIMIT,
} from '../constants/counter';

export type CounterState = {
  count: number;
  pressCount: number;
  isResetting: boolean;
  isIdle: boolean;
  stepsUntilBonus: number;
  history: number[];
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  startFastIncrement: () => void;
  stopFastIncrement: () => void;
};

export function useCounter(): CounterState {
  const [count, setCount] = useState(0);
  const [pressCount, setPressCount] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [history, setHistory] = useState<number[]>([]);

  const countRef = useRef(0);
  const pressCountRef = useRef(0);
  const isUserActionRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoDecrRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fastIncrRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scheduleRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (isUserActionRef.current) {
      isUserActionRef.current = false;
      setHistory(prev => [count, ...prev].slice(0, HISTORY_LIMIT));
    }
  }, [count]);

  const cancelAutoDecrement = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (autoDecrRef.current) {
      clearInterval(autoDecrRef.current);
      autoDecrRef.current = null;
      setIsIdle(false);
    }
  }, []);

  const scheduleIdleTimer = useCallback(() => {
    cancelAutoDecrement();
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
      autoDecrRef.current = setInterval(() => {
        setCount(prev => {
          if (prev <= 0) {
            clearInterval(autoDecrRef.current!);
            autoDecrRef.current = null;
            setIsIdle(false);
            countRef.current = 0;
            return 0;
          }
          const next = prev - 1;
          countRef.current = next;
          return next;
        });
      }, AUTO_DECREMENT_MS);
    }, IDLE_DELAY_MS);
  }, [cancelAutoDecrement]);

  useEffect(() => { scheduleRef.current = scheduleIdleTimer; }, [scheduleIdleTimer]);

  useEffect(() => {
    scheduleIdleTimer();
    return () => {
      cancelAutoDecrement();
      if (resetRef.current) clearInterval(resetRef.current);
      if (fastIncrRef.current) clearInterval(fastIncrRef.current);
    };
  }, [scheduleIdleTimer, cancelAutoDecrement]);

  const applyIncrement = useCallback(() => {
    pressCountRef.current += 1;
    const nextPress = pressCountRef.current;
    const step = nextPress % BONUS_EVERY_N === 0 ? BONUS_EVERY_N : 1;
    setPressCount(nextPress);
    setCount(prev => {
      const next = prev + step;
      countRef.current = next;
      return next;
    });
  }, []);

  const increment = useCallback(() => {
    if (isResetting) return;
    isUserActionRef.current = true;
    applyIncrement();
    scheduleIdleTimer();
  }, [isResetting, applyIncrement, scheduleIdleTimer]);

  const decrement = useCallback(() => {
    if (isResetting || countRef.current === 0) return;
    isUserActionRef.current = true;
    setCount(prev => {
      const next = Math.max(0, prev - 1);
      countRef.current = next;
      return next;
    });
    scheduleIdleTimer();
  }, [isResetting, scheduleIdleTimer]);

  const reset = useCallback(() => {
    if (isResetting || countRef.current === 0) return;
    cancelAutoDecrement();
    pressCountRef.current = 0;
    setPressCount(0);
    setIsResetting(true);
    resetRef.current = setInterval(() => {
      setCount(prev => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(resetRef.current!);
          resetRef.current = null;
          setIsResetting(false);
          countRef.current = 0;
          scheduleRef.current();
          return 0;
        }
        countRef.current = next;
        return next;
      });
    }, RESET_STEP_MS);
  }, [isResetting, cancelAutoDecrement]);

  const startFastIncrement = useCallback(() => {
    if (isResetting) return;
    cancelAutoDecrement();
    applyIncrement();
    fastIncrRef.current = setInterval(applyIncrement, FAST_INCREMENT_MS);
  }, [isResetting, cancelAutoDecrement, applyIncrement]);

  const stopFastIncrement = useCallback(() => {
    if (!fastIncrRef.current) return;
    clearInterval(fastIncrRef.current);
    fastIncrRef.current = null;
    setHistory(prev => [countRef.current, ...prev].slice(0, HISTORY_LIMIT));
    scheduleIdleTimer();
  }, [scheduleIdleTimer]);

  const stepsUntilBonus = BONUS_EVERY_N - (pressCount % BONUS_EVERY_N);

  return {
    count,
    pressCount,
    isResetting,
    isIdle,
    stepsUntilBonus,
    history,
    increment,
    decrement,
    reset,
    startFastIncrement,
    stopFastIncrement,
  };
}
