import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';

export type CounterButtonProps = {
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
  onPressOut?: () => void;
  disabled: boolean;
  style?: StyleProp<ViewStyle>;
};

const CounterButton = React.memo(function CounterButton({
  label,
  onPress,
  onLongPress,
  onPressOut,
  disabled,
  style,
}: CounterButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.dimmed, style]}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressOut={onPressOut}
      disabled={disabled}
      delayLongPress={300}
      activeOpacity={0.75}
    >
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#4a90e2',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  dimmed: {
    opacity: 0.4,
  },
  label: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default CounterButton;
