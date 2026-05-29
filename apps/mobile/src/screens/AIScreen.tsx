import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { ChatBubble } from '../components/ai/ChatBubble';
import { QuickQuestions } from '../components/ai/QuickQuestions';
import { ChatInput } from '../components/ai/ChatInput';
import { useAIStore, AIMessage } from '../stores/aiStore';
import { createChatStream, shopApi } from '../services/api';
import { spacing, fontSize, borderRadius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

export default function AIScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const headerOpacity = useRef(new Animated.Value(0)).current;

  const messages = useStore(useAIStore, (s) => s.messages);
  const isStreaming = useStore(useAIStore, (s) => s.isStreaming);
  const currentConversationId = useStore(useAIStore, (s) => s.currentConversationId);
  const addUserMessage = useStore(useAIStore, (s) => s.addUserMessage);
  const addAssistantMessage = useStore(useAIStore, (s) => s.addAssistantMessage);
  const updateLastAssistantMessage = useStore(useAIStore, (s) => s.updateLastAssistantMessage);
  const updateLastAssistantThinking = useStore(useAIStore, (s) => s.updateLastAssistantThinking);
  const setStreaming = useStore(useAIStore, (s) => s.setStreaming);
  const setCurrentConversation = useStore(useAIStore, (s) => s.setCurrentConversation);
  const clearMessages = useStore(useAIStore, (s) => s.clearMessages);
  const [thinkingEnabled, setThinkingEnabled] = useState(false);

  useEffect(() => {
    Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    clearMessages();
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const handleSend = useCallback(async (content: string, imageUrl?: string) => {
    addUserMessage(content, imageUrl);
    setStreaming(true);

    let assistantContent = '';
    addAssistantMessage('');

    await createChatStream(
      content,
      currentConversationId ?? undefined,
      (chunk) => {
        assistantContent += chunk;
        updateLastAssistantMessage(assistantContent);
      },
      (convId) => {
        setCurrentConversation(convId);
        setStreaming(false);
      },
      (error) => {
        updateLastAssistantMessage(`${t('ai.errorMessage')}${error}`);
        setStreaming(false);
      },
      (thinkingChunk) => {
        updateLastAssistantThinking(thinkingChunk);
      },
      thinkingEnabled,
      (searchResults) => {
        useAIStore.getState().setSearchResults(searchResults);
      },
      imageUrl,
    );
  }, [currentConversationId, thinkingEnabled]);

  const handleRestaurantPress = useCallback(async (name: string) => {
    try {
      const cleanName = name
        .replace(/[^一-龥a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '')
        .trim();

      if (!cleanName) return;

      const res = await shopApi.list({ keyword: cleanName, page: 1, limit: 5 });
      const shops = res.data?.items || [];
      const shop = shops.find((s: any) => s.name.includes(cleanName) || cleanName.includes(s.name));
      if (shop) {
        navigation.navigate('Home' as never, { screen: 'ShopDetail', params: { id: shop.id } } as never);
      } else if (shops.length > 0) {
        navigation.navigate('Home' as never, { screen: 'ShopDetail', params: { id: shops[0].id } } as never);
      }
    } catch (e) {
      console.log('[AI] Restaurant press error:', e);
    }
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerDot} />
          <Text style={styles.headerTitle}>{t('ai.title')}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.thinkingToggleBtn, thinkingEnabled && styles.thinkingToggleBtnActive]}
            onPress={() => setThinkingEnabled(!thinkingEnabled)}
            activeOpacity={0.7}
          >
            <Text style={[styles.thinkingToggleBtnText, thinkingEnabled && styles.thinkingToggleBtnTextActive]}>
              🧠
            </Text>
          </TouchableOpacity>
          {messages.length > 0 && (
            <Text style={styles.newChatBtn} onPress={clearMessages}>{t('ai.newChat')}</Text>
          )}
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && (
          <Animated.View style={[styles.welcomeContainer, { opacity: headerOpacity }]}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>🤖</Text>
            </View>
            <Text style={styles.welcomeTitle}>{t('ai.title')}</Text>
            <Text style={styles.welcomeSubtitle}>{t('ai.welcomeSubtitle')}</Text>

            <View style={styles.featureRow}>
              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>🔍</Text>
                <Text style={styles.featureText}>{t('ai.smartSearch')}</Text>
              </View>
              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>⭐</Text>
                <Text style={styles.featureText}>{t('ai.curatedRec')}</Text>
              </View>
              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>📍</Text>
                <Text style={styles.featureText}>{t('ai.nearbyShops')}</Text>
              </View>
            </View>

            <QuickQuestions onSelect={handleSend} />
          </Animated.View>
        )}

        {messages.map((item) => (
          <ChatBubble
            key={item.id}
            role={item.role}
            content={item.content}
            thinkingContent={item.thinkingContent}
            imageUrl={item.imageUrl}
            searchResults={item.searchResults}
            onRestaurantPress={handleRestaurantPress}
          />
        ))}

        {isStreaming && (
          <View style={styles.typingRow}>
            <View style={styles.typingAvatar}>
              <Text style={{ fontSize: 14 }}>🤖</Text>
            </View>
            <View style={styles.typingBubble}>
              <View style={styles.typingDots}>
                <View style={[styles.dot, styles.dot1]} />
                <View style={[styles.dot, styles.dot2]} />
                <View style={[styles.dot, styles.dot3]} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, height: 56, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  newChatBtn: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '500' },
  thinkingToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thinkingToggleBtnActive: {
    backgroundColor: '#FFF3ED',
    borderColor: '#FF6B35',
  },
  thinkingToggleBtnText: {
    fontSize: 16,
  },
  thinkingToggleBtnTextActive: {
    fontSize: 16,
  },
  listContent: { paddingBottom: spacing.md },
  welcomeContainer: { paddingTop: spacing.xl, alignItems: 'center' },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#FFF3ED', justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarEmoji: { fontSize: 36 },
  welcomeTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  welcomeSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.lg },
  featureRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl, paddingHorizontal: spacing.lg },
  featureCard: {
    flex: 1, alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, padding: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  featureIcon: { fontSize: 24, marginBottom: spacing.xs },
  featureText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '500' },
  typingRow: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 8 },
  typingAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF3ED', justifyContent: 'center', alignItems: 'center' },
  typingBubble: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.xs, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  typingDots: { flexDirection: 'row', gap: 4, alignItems: 'center', height: 16 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textLight },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.6 },
  dot3: { opacity: 0.8 },
});
