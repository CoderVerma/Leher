import {useState, useRef, useEffect, useCallback} from 'react';
import {NativeEventEmitter} from 'react-native';
import NativeCounter from '../native/NativeCounter';
import {
  IDLE_DELAY_MS,
  AUTO_DECREMENT_MS,
  FAST_INCREMENT_MS,
  BONUS_EVERY_N,
  HISTORY_LIMIT,
} from '../constants/counter';

type CounterChangeEvent = {value: number; pressCount: number};

const emitter = new NativeEventEmitter(NativeCounter);

export function useNativeCounter() {
  const [count, setCount] = useState(() => NativeCounter.getValue());
  const [pressCount, setPressCount] = useState(0);
  const [isIdle, setIsIdle] = useState(false);
  const [history, setHistory] = useState<number[]>([]);

  const isResetting = false;

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoDecrRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fastIncrRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const sub = emitter.addListener(
      'onCounterChange',
      (event: CounterChangeEvent) => {
        setCount(event.value);
        setPressCount(event.pressCount);
      },
    );
    return () => sub.remove();
  }, []);

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
        NativeCounter.decrement();
      }, AUTO_DECREMENT_MS);
    }, IDLE_DELAY_MS);
  }, [cancelAutoDecrement]);

  useEffect(() => {
    scheduleIdleTimer();
    return () => {
      cancelAutoDecrement();
      if (fastIncrRef.current) clearInterval(fastIncrRef.current);
    };
  }, [scheduleIdleTimer, cancelAutoDecrement]);

  const recordHistory = useCallback((value: number) => {
    setHistory(prev => [value, ...prev].slice(0, HISTORY_LIMIT));
  }, []);

  const increment = useCallback(() => {
    const newValue = NativeCounter.increment();
    recordHistory(newValue);
    scheduleIdleTimer();
  }, [recordHistory, scheduleIdleTimer]);

  const decrement = useCallback(() => {
    const newValue = NativeCounter.decrement();
    recordHistory(newValue);
    scheduleIdleTimer();
  }, [recordHistory, scheduleIdleTimer]);

  const reset = useCallback(() => {
    NativeCounter.reset();
    recordHistory(0);
    scheduleIdleTimer();
  }, [recordHistory, scheduleIdleTimer]);

  const startFastIncrement = useCallback(() => {
    cancelAutoDecrement();
    NativeCounter.increment();
    fastIncrRef.current = setInterval(() => {
      NativeCounter.increment();
    }, FAST_INCREMENT_MS);
  }, [cancelAutoDecrement]);

  const stopFastIncrement = useCallback(() => {
    if (!fastIncrRef.current) return;
    clearInterval(fastIncrRef.current);
    fastIncrRef.current = null;
    setHistory(prev =>
      [NativeCounter.getValue(), ...prev].slice(0, HISTORY_LIMIT),
    );
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
