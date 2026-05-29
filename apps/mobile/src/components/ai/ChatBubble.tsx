import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../../theme/tokens';

interface Props {
  role: 'user' | 'assistant';
  content: string;
}

// Parse restaurant recommendations from AI response
function parseRestaurants(text: string): { intro: string; restaurants: string[] } {
  const parts = text.split(/(?=🍽️)/);
  const intro = parts[0]?.trim() || '';
  const restaurants = parts.slice(1).map((r) => r.trim()).filter(Boolean);
  return { intro, restaurants };
}

function RestaurantCard({ text }: { text: string }) {
  const lines = text.split('\n').filter((l) => l.trim());
  const name = lines[0]?.replace(/🍽️?\s*\**/g, '').replace(/\**/g, '').trim() || '';

  const getField = (emoji: string) => {
    const line = lines.find((l) => l.includes(emoji));
    return line?.split('：')[1]?.trim() || '';
  };

  return (
    <View style={styles.restaurantCard}>
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
    </View>
  );
}

export const ChatBubble: React.FC<Props> = ({ role, content }) => {
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

  // Assistant message — parse for restaurant cards
  const { intro, restaurants } = parseRestaurants(content);

  return (
    <View style={styles.assistantContainer}>
      <View style={styles.assistantAvatar}>
        <Text style={{ fontSize: 14 }}>🤖</Text>
      </View>
      <View style={styles.assistantContent}>
        {intro ? <Text style={styles.assistantText}>{intro}</Text> : null}
        {restaurants.map((r, i) => (
          <RestaurantCard key={i} text={r} />
        ))}
        {!intro && restaurants.length === 0 && content ? (
          <Text style={styles.assistantText}>{content}</Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // User
  userContainer: { marginVertical: 4, paddingHorizontal: spacing.md, alignItems: 'flex-end' },
  userBubble: {
    backgroundColor: colors.primary, maxWidth: '80%',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg, borderBottomRightRadius: borderRadius.xs,
  },
  userText: { fontSize: fontSize.md, color: '#FFF', lineHeight: 22 },

  // Assistant
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

  // Restaurant card
  restaurantCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border, marginTop: spacing.sm,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
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
});
