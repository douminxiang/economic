import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontSize, spacing, borderRadius } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  onSelect: (question: string) => void;
}

export const QuickQuestions: React.FC<Props> = ({ onSelect }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const QUICK_QUESTIONS = [
    { icon: '🍜', text: t('ai.quickQuestions.nearby'), color: '#FFF3ED' },
    { icon: '💰', text: t('ai.quickQuestions.budget'), color: '#E8F5E9' },
    { icon: '⭐', text: t('ai.quickQuestions.topRated'), color: '#FFF8E1' },
    { icon: '🎉', text: t('ai.quickQuestions.groupDining'), color: '#E3F2FD' },
    { icon: '🌶️', text: t('ai.quickQuestions.spicy'), color: '#FCE4EC' },
    { icon: '☕', text: t('ai.quickQuestions.afternoonTea'), color: '#F3E5F5' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('ai.askMe')}</Text>
      <View style={styles.grid}>
        {QUICK_QUESTIONS.map((q, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.chip, { backgroundColor: q.color }]}
            onPress={() => onSelect(q.text)}
            activeOpacity={0.7}
          >
            <Text style={styles.chipIcon}>{q.icon}</Text>
            <Text style={styles.chipText}>{q.text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
    marginLeft: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    gap: 6,
  },
  chipIcon: { fontSize: 16 },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
});
