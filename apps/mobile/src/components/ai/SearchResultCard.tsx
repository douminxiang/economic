// apps/mobile/src/components/ai/SearchResultCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { fontSize, spacing, borderRadius } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface Props {
  results: SearchResult[];
}

export const SearchResultCard: React.FC<Props> = ({ results }) => {
  const { colors } = useTheme();

  if (!results || results.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>🌐 Web Search Results</Text>
      {results.map((result, index) => (
        <TouchableOpacity
          key={index}
          style={styles.resultCard}
          activeOpacity={0.7}
          onPress={() => Linking.openURL(result.url)}
        >
          <Text style={styles.resultTitle} numberOfLines={1}>{result.title}</Text>
          <Text style={styles.resultSnippet} numberOfLines={2}>{result.snippet}</Text>
          <Text style={styles.resultUrl} numberOfLines={1}>{result.url}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  resultCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resultTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
  },
  resultSnippet: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 2,
  },
  resultUrl: {
    fontSize: 10,
    color: colors.textLight,
  },
});
