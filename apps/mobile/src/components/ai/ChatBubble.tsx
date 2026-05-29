import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../../theme/tokens';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  onRestaurantPress?: (name: string) => void;
}

function parseRestaurants(text: string): { intro: string; restaurants: string[] } {
  const parts = text.split(/(?=🍽️)/);
  const intro = parts[0]?.trim() || '';
  const restaurants = parts.slice(1).map((r) => r.trim()).filter(Boolean);
  return { intro, restaurants };
}

function RestaurantCard({ text, onPress }: { text: string; onPress?: (name: string) => void }) {
  const lines = text.split('\n').filter((l) => l.trim());
  const name = lines[0]?.replace(/🍽️?\s*\**/g, '').replace(/\**/g, '').trim() || '';

  const getField = (emoji: string) => {
    const line = lines.find((l) => l.includes(emoji));
    return line?.split('：')[1]?.trim() || '';
  };

  return (
    <TouchableOpacity
      style={styles.restaurantCard}
      activeOpacity={0.7}
      onPress={() => onPress?.(name)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardName}>{name}</Text>
      </View>
      <View style={styles.cardBody}>
        {getField('📍') ? (
          <View style={styles.cardRow}>
            <Text style={styles.cardEmoji}>📍</Text>
            <Text style={styles.cardDetail}>{getField('📍')}</Text>
          </View>
        ) : null}
        {getField('💰') ? (
          <View style={styles.cardRow}>
            <Text style={styles.cardEmoji}>💰</Text>
            <Text style={styles.cardDetail}>{getField('💰')}</Text>
          </View>
        ) : null}
        {getField('⭐') ? (
          <View style={styles.cardRow}>
            <Text style={styles.cardEmoji}>⭐</Text>
            <Text style={styles.cardDetail}>{getField('⭐')}</Text>
          </View>
        ) : null}
        {getField('🔥') ? (
          <View style={styles.cardRow}>
            <Text style={styles.cardEmoji}>🔥</Text>
            <Text style={styles.cardDetail}>{getField('🔥')}</Text>
          </View>
        ) : null}
        {getField('💬') ? (
          <View style={styles.cardRow}>
            <Text style={styles.cardEmoji}>💬</Text>
            <Text style={[styles.cardDetail, styles.cardReason]}>{getField('💬')}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cardButton}>
        <Text style={styles.cardButtonText}>查看详情 ›</Text>
      </View>
    </TouchableOpacity>
  );
}

export const ChatBubble: React.FC<Props> = ({ role, content, onRestaurantPress }) => {
  const isUser = role === 'user';

  if (isUser) {
    return (
      <View style={styles.userContainer}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{content}</Text>
        </View>
      </View>
    );
  }

  const { intro, restaurants } = parseRestaurants(content);

  return (
    <View style={styles.assistantContainer}>
      <View style={styles.assistantAvatar}>
        <Text style={{ fontSize: 14 }}>🤖</Text>
      </View>
      <View style={styles.assistantContent}>
        {intro ? <Text style={styles.assistantText}>{intro}</Text> : null}
        {restaurants.map((r, i) => (
          <RestaurantCard key={i} text={r} onPress={onRestaurantPress} />
        ))}
        {!intro && restaurants.length === 0 && content ? (
          <Text style={styles.assistantText}>{content}</Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  userContainer: { marginVertical: 4, paddingHorizontal: spacing.md, alignItems: 'flex-end' },
  userBubble: {
    backgroundColor: colors.primary, maxWidth: '80%',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg, borderBottomRightRadius: borderRadius.xs,
  },
  userText: { fontSize: fontSize.md, color: '#FFF', lineHeight: 22 },

  assistantContainer: {
    marginVertical: 4, paddingHorizontal: spacing.md,
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
  },
  assistantAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF3ED',
    justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  assistantContent: { flex: 1, maxWidth: '85%' },
  assistantText: {
    fontSize: fontSize.md, color: colors.text, lineHeight: 24,
    backgroundColor: colors.surface, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, borderRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.xs, borderWidth: 1, borderColor: colors.border,
  },

  restaurantCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border, marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    backgroundColor: '#FFF3ED', paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: '#FFE8DD',
  },
  cardName: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary },
  cardBody: { padding: spacing.md, gap: 6 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  cardEmoji: { fontSize: fontSize.sm, marginTop: 1 },
  cardDetail: { flex: 1, fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
  cardReason: { color: colors.textSecondary, fontStyle: 'italic' },
  cardButton: {
    backgroundColor: colors.primary, paddingVertical: spacing.sm,
    alignItems: 'center', borderTopWidth: 1, borderTopColor: '#FFE8DD',
  },
  cardButtonText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
});
