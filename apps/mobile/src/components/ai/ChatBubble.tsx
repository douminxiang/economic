import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontSize, spacing, borderRadius, shadows } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { SearchResultCard } from './SearchResultCard';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface Props {
  role: 'user' | 'assistant';
  content: string;
  thinkingContent?: string;
  imageUrl?: string;
  searchResults?: SearchResult[];
  onRestaurantPress?: (name: string) => void;
}

function parseRestaurants(text: string): { intro: string; restaurants: string[] } {
  const parts = text.split(/(?=🍽️)/);
  const intro = parts[0]?.trim() || '';
  const restaurants = parts.slice(1).map((r) => r.trim()).filter(Boolean);
  return { intro, restaurants };
}

function RestaurantCard({
  text,
  onPress,
  styles,
}: {
  text: string;
  onPress?: (name: string) => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const { t } = useTranslation();
  const lines = text.split('\n').filter((l) => l.trim());
  const name = lines[0]?.replace(/🍽️?\s*\**/g, '').replace(/\**/g, '').trim() || '';

  const getField = (emoji: string) => {
    const line = lines.find((l) => l.includes(emoji));
    return line?.replace(new RegExp(`^.*${emoji}\\s*`), '').replace(/：/g, ':').split(':').pop()?.trim() || line?.trim() || '';
  };

  return (
    <TouchableOpacity style={styles.restaurantCard} activeOpacity={0.7} onPress={() => onPress?.(name)}>
      <Text style={styles.restName}>🍽️ {name}</Text>
      {getField('📍') ? <Text style={styles.restLine}>📍 {getField('📍')}</Text> : null}
      {getField('💰') ? <Text style={styles.restLine}>💰 {getField('💰')}</Text> : null}
      {getField('⭐') ? <Text style={styles.restLine}>⭐ {getField('⭐')}</Text> : null}
      {getField('🔥') ? <Text style={styles.restLine}>🔥 {getField('🔥')}</Text> : null}
      {getField('💬') ? <Text style={styles.restReason}>💬 {getField('💬')}</Text> : null}
      <View style={styles.restBtn}>
        <Text style={styles.restBtnText}>{t('ai.viewDetails')}</Text>
      </View>
    </TouchableOpacity>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    userWrap: { marginVertical: 8, paddingHorizontal: spacing.md, alignItems: 'flex-end', gap: 4 },
    userBubble: {
      backgroundColor: colors.primary,
      maxWidth: '82%',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
    },
    userText: { fontSize: 15, color: '#FFF', lineHeight: 22 },
    userTime: { fontSize: 11, color: colors.textLight },
    userImage: { width: 200, height: 150, borderRadius: 12, marginBottom: 4 },

    assistantWrap: {
      marginVertical: 8,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-start',
    },
    assistantAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#FFF3ED',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 2,
    },
    assistantContent: { flex: 1, maxWidth: '88%', gap: 8 },
    thinkingToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignSelf: 'flex-start',
    },
    thinkingToggleText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    thinkingArrow: { fontSize: 14, color: colors.primary },
    thinkingBox: {
      backgroundColor: '#F5F5F5',
      borderLeftWidth: 2,
      borderLeftColor: colors.primary,
      borderRadius: 8,
      padding: 12,
    },
    thinkingText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
    assistantText: {
      fontSize: fontSize.sm,
      color: colors.text,
      lineHeight: 22,
    },
    restaurantCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      gap: 6,
      ...shadows.sm,
    },
    restName: { fontSize: 16, fontWeight: '700', color: colors.text },
    restLine: { fontSize: 12, color: colors.textSecondary },
    restReason: { fontSize: 12, color: colors.primary },
    restBtn: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primary,
      borderRadius: borderRadius.full,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginTop: 4,
    },
    restBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  });
}

export const ChatBubble: React.FC<Props> = ({
  role,
  content,
  thinkingContent,
  imageUrl,
  searchResults,
  onRestaurantPress,
}) => {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isUser = role === 'user';
  const [thinkingExpanded, setThinkingExpanded] = useState(false);
  const thinkingLabel = i18n.language === 'zh-CN' ? t('ai.deepThinkingLabel') : t('ai.deepThinkingLabel');

  if (isUser) {
    return (
      <View style={styles.userWrap}>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.userImage} /> : null}
        {content ? (
          <View style={styles.userBubble}>
            <Text style={styles.userText}>{content}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  const { intro, restaurants } = parseRestaurants(content);

  return (
    <View style={styles.assistantWrap}>
      <View style={styles.assistantAvatar}>
        <Text style={{ fontSize: 14 }}>🤖</Text>
      </View>
      <View style={styles.assistantContent}>
        {thinkingContent ? (
          <TouchableOpacity
            style={styles.thinkingToggle}
            onPress={() => setThinkingExpanded(!thinkingExpanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.thinkingArrow}>{thinkingExpanded ? '▾' : '▸'}</Text>
            <Text style={styles.thinkingToggleText}>{thinkingLabel}</Text>
          </TouchableOpacity>
        ) : null}
        {thinkingContent && thinkingExpanded ? (
          <View style={styles.thinkingBox}>
            <Text style={styles.thinkingText}>{thinkingContent}</Text>
          </View>
        ) : null}
        {searchResults && searchResults.length > 0 ? <SearchResultCard results={searchResults} /> : null}
        {intro ? <Text style={styles.assistantText}>{intro}</Text> : null}
        {restaurants.map((r, i) => (
          <RestaurantCard key={i} text={r} onPress={onRestaurantPress} styles={styles} />
        ))}
        {!intro && restaurants.length === 0 && content ? (
          <Text style={styles.assistantText}>{content}</Text>
        ) : null}
      </View>
    </View>
  );
};
