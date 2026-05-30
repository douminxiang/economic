import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { spacing, borderRadius, fontSize } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  message?: string;
  onRetry?: () => void;
}

export const ErrorView: React.FC<Props> = ({ message, onRetry }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.md },
        title: { fontSize: 18, fontWeight: '600', color: colors.text },
        desc: { fontSize: 14, color: colors.textSecondary },
        btn: {
          paddingHorizontal: 24,
          paddingVertical: 12,
          backgroundColor: colors.primary,
          borderRadius: borderRadius.md,
          marginTop: spacing.md,
        },
        btnText: { color: '#FFF', fontWeight: '600' },
        icon: { fontSize: 48 },
      }),
    [colors],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📡</Text>
      <Text style={styles.title}>{message || t('error.networkFailed')}</Text>
      <Text style={styles.desc}>{t('error.checkNetwork')}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.btn} onPress={onRetry}>
          <Text style={styles.btnText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
