import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** 默认避开刘海/状态栏；底部由 Tab 栏或页面自行处理 */
  edges?: Edge[];
}

const DEFAULT_EDGES: Edge[] = ['top', 'left', 'right'];

export function Screen({ children, style, edges = DEFAULT_EDGES }: ScreenProps) {
  return (
    <SafeAreaView style={[styles.flex, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
