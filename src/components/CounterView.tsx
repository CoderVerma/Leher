import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CounterButton from './CounterButton';
import CounterHistory from './CounterHistory';
import { BONUS_EVERY_N } from '../constants/counter';

export type CounterViewProps = {
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

function CounterView({
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
}: CounterViewProps) {
  const hint = isResetting
    ? 'Resetting…'
    : isIdle
    ? 'Idle — auto-decrementing'
    : stepsUntilBonus === 1
    ? 'Next increment is +5!'
    : pressCount === 0 && history.length === 0
    ? 'Hold Increment to fast-count'
    : `${stepsUntilBonus} more to +${BONUS_EVERY_N} bonus`;

  return (
    <View style={styles.root}>
      <Text style={styles.counter}>{count}</Text>
      <Text style={styles.hint}>{hint}</Text>

      <View style={styles.buttons}>
        <CounterButton
          label="Increment"
          onPress={increment}
          onLongPress={startFastIncrement}
          onPressOut={stopFastIncrement}
          disabled={isResetting}
        />
        <CounterButton
          label="Decrement"
          onPress={decrement}
          disabled={isResetting}
        />
        <CounterButton
          label="Reset"
          onPress={reset}
          disabled={isResetting}
          style={styles.resetBtn}
        />
      </View>

      <CounterHistory history={history} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    color: '#aaa',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  counter: {
    fontSize: 100,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  hint: {
    fontSize: 14,
    color: '#888',
    marginBottom: 48,
    height: 20,
  },
  buttons: {
    gap: 12,
    width: '70%',
  },
  resetBtn: {
    backgroundColor: '#e24a4a',
  },
});

export default CounterView;
