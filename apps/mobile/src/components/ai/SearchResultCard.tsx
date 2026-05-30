import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontSize, spacing, borderRadius, shadows } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface Props {
  results: SearchResult[];
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      gap: 8,
      ...shadows.sm,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    resultItem: { gap: 2 },
    resultTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    resultSnippet: {
      fontSize: 11,
      color: colors.textLight,
      lineHeight: 16,
    },
  });
}

export const SearchResultCard: React.FC<Props> = ({ results }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!results || results.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{t('ai.webSearchResults')}</Text>
      {results.map((result, index) => (
        <TouchableOpacity
          key={`${result.url}-${index}`}
          style={styles.resultItem}
          activeOpacity={0.7}
          onPress={() => Linking.openURL(result.url)}
        >
          <Text style={styles.resultTitle} numberOfLines={1}>
            {result.title}
          </Text>
          <Text style={styles.resultSnippet} numberOfLines={2}>
            {result.snippet}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
