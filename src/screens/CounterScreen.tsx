import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useCounter} from '../hooks/useCounter';
import {useNativeCounter} from '../hooks/useNativeCounter';
import CounterView from '../components/CounterView';

function JsCounterContainer() {
  const state = useCounter();
  return <CounterView {...state} />;
}

function NativeCounterContainer() {
  const state = useNativeCounter();
  return <CounterView {...state} />;
}

export default function CounterScreen() {
  const [useNative, setUseNative] = useState(false);

  return (
    <View style={styles.screen}>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, !useNative && styles.toggleBtnActive]}
          onPress={() => setUseNative(false)}
          activeOpacity={0.75}>
          <Text style={[styles.toggleLabel, !useNative && styles.toggleLabelActive]}>
            JS
          </Text>
        </TouchableOpacity>

        <View style={styles.toggleSep} />

        <TouchableOpacity
          style={[styles.toggleBtn, useNative && styles.toggleBtnActive]}
          onPress={() => setUseNative(true)}
          activeOpacity={0.75}>
          <Text style={[styles.toggleLabel, useNative && styles.toggleLabelActive]}>
            Native (C++)
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.modeCaption}>
        {useNative
          ? 'State lives in C++ · JSI sync calls · events via NativeEventEmitter'
          : 'State lives in JS · React hooks · no native layer'}
      </Text>

      {useNative ? <NativeCounterContainer /> : <JsCounterContainer />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 6,
  },
  toggleBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  toggleBtnActive: {
    backgroundColor: '#4a90e2',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#aaa',
  },
  toggleLabelActive: {
    color: '#fff',
  },
  toggleSep: {
    width: 1,
    height: 18,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  modeCaption: {
    textAlign: 'center',
    fontSize: 11,
    color: '#bbb',
    marginBottom: 4,
    paddingHorizontal: 24,
  },
});
