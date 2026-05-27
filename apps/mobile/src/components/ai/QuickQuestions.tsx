import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../../theme/tokens';

interface Props {
  onSelect: (question: string) => void;
}

const QUICK_QUESTIONS = [
  '附近有什么好吃的？',
  '人均50以内推荐',
  '评分最高的商家',
  '适合聚餐的地方',
];

export const QuickQuestions: React.FC<Props> = ({ onSelect }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>快捷问题</Text>
      <View style={styles.grid}>
        {QUICK_QUESTIONS.map((q, i) => (
          <TouchableOpacity
            key={i}
            style={styles.chip}
            onPress={() => onSelect(q)}
          >
            <Text style={styles.chipText}>{q}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.full,
  },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
});
