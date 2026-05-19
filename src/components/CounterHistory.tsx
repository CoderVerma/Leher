import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  history: number[];
};

function CounterHistory({ history }: Props) {
  if (history.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Recent</Text>
      <View style={styles.row}>
        {history.map((value, index) => (
          <View key={index} style={[styles.chip, index === 0 && styles.chipLatest]}>
            <Text style={[styles.chipText, index === 0 && styles.chipTextLatest]}>
              {value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 36,
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    color: '#bbb',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipLatest: {
    backgroundColor: '#4a90e2',
  },
  chipText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  chipTextLatest: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default CounterHistory;
