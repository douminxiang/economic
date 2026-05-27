import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../theme/tokens';

interface Props {
  message?: string;
  onRetry?: () => void;
}

export const ErrorView: React.FC<Props> = ({ message = '网络连接失败', onRetry }) => (
  <View style={styles.container}>
    <Text style={styles.icon}>📡</Text>
    <Text style={styles.title}>{message}</Text>
    <Text style={styles.desc}>请检查网络连接后重试</Text>
    {onRetry && (
      <TouchableOpacity style={styles.btn} onPress={onRetry}>
        <Text style={styles.btnText}>重新加载</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  icon: { fontSize: 48 },
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  desc: { fontSize: 14, color: colors.textSecondary },
  btn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.primary, borderRadius: borderRadius.md, marginTop: spacing.md },
  btnText: { fontSize: 14, fontWeight: '600', color: colors.white },
});
