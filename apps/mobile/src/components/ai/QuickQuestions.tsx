import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../../theme/tokens';

interface Props {
  onSelect: (question: string) => void;
}

const QUICK_QUESTIONS = [
  { icon: '🍜', text: '附近有什么好吃的？', color: '#FFF3ED' },
  { icon: '💰', text: '人均50以内推荐', color: '#E8F5E9' },
  { icon: '⭐', text: '评分最高的餐厅', color: '#FFF8E1' },
  { icon: '🎉', text: '适合聚餐的地方', color: '#E3F2FD' },
  { icon: '🌶️', text: '推荐辣味美食', color: '#FCE4EC' },
  { icon: '☕', text: '下午茶好去处', color: '#F3E5F5' },
];

export const QuickQuestions: React.FC<Props> = ({ onSelect }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>你可以这样问我</Text>
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
