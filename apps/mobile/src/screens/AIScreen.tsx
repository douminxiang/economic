import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { ChatBubble } from '../components/ai/ChatBubble';
import { QuickQuestions } from '../components/ai/QuickQuestions';
import { ChatInput } from '../components/ai/ChatInput';
import { useAIStore } from '../stores/aiStore';
import { createChatStream, shopApi, abortActiveChatStream } from '../services/api';
import { spacing, fontSize, borderRadius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { shopSearchKeywords } from '../utils/aiRestaurant';
import { navigateToShopDetail } from '../utils/navigateToShop';

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
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.md,
          height: 56,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
        headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        thinkingToggle: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: borderRadius.full,
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
        },
        thinkingToggleActive: {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        thinkingEmoji: { fontSize: 14 },
        thinkingLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
        thinkingLabelActive: { color: '#FFF' },
        newChatBtn: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '500' },
        listContent: { paddingVertical: spacing.md, paddingBottom: spacing.sm },
        welcomeContainer: { paddingTop: spacing.xl, alignItems: 'center' },
        avatarCircle: {
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: '#FFF3ED',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: spacing.md,
        },
        avatarEmoji: { fontSize: 36 },
        welcomeTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
        welcomeSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.lg },
        featureRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl, paddingHorizontal: spacing.lg },
        featureCard: {
          flex: 1,
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 1,
        },
        featureIcon: { fontSize: 24, marginBottom: spacing.xs },
        featureText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '500' },
        typingRow: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 8 },
        typingAvatar: {
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: '#FFF3ED',
          justifyContent: 'center',
          alignItems: 'center',
        },
        typingBubble: {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          borderBottomLeftRadius: borderRadius.xs,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderWidth: 1,
          borderColor: colors.border,
        },
        typingDots: { flexDirection: 'row', gap: 4, alignItems: 'center', height: 16 },
        dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textLight },
        dot1: { opacity: 0.4 },
        dot2: { opacity: 0.6 },
        dot3: { opacity: 0.8 },
      }),
    [colors],
  );

  useEffect(() => {
    Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  // 跳转店铺详情时中断 SSE，避免返回后出现误报「网络连接失败」
  useFocusEffect(
    useCallback(() => {
      return () => {
        abortActiveChatStream();
        setStreaming(false);
      };
    }, [setStreaming]),
  );

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const handleSend = useCallback(
    async (content: string, imageUrl?: string) => {
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
        webSearchEnabled,
      );
    },
    [currentConversationId, thinkingEnabled, webSearchEnabled, t],
  );

  const handleRestaurantPress = useCallback(
    async (name: string, shopId?: number) => {
      try {
        if (shopId) {
          navigateToShopDetail(shopId, navigation);
          return;
        }

        const keywords = shopSearchKeywords(name);
        let matched: { id: number; name: string } | undefined;

        for (const keyword of keywords) {
          const res = await shopApi.list({ keyword, page: 1, limit: 10 });
          const shops: Array<{ id: number; name: string }> = res.data?.items || [];
          matched =
            shops.find((s) => s.name === name) ||
            shops.find((s) => s.name.includes(keyword) || keyword.includes(s.name)) ||
            shops[0];
          if (matched) break;
        }

        if (matched) {
          navigateToShopDetail(matched.id, navigation);
        } else {
          Alert.alert(t('common.error'), t('ai.shopNotFound', { name }));
        }
      } catch (e: any) {
        console.log('[AI] Restaurant press error:', e);
        Alert.alert(t('common.error'), e?.message || t('ai.shopNavigateFailed'));
      }
    },
    [navigation, t],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('ai.title')}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.thinkingToggle, webSearchEnabled && styles.thinkingToggleActive]}
            onPress={() => setWebSearchEnabled(!webSearchEnabled)}
            activeOpacity={0.7}
          >
            <Text style={styles.thinkingEmoji}>🌐</Text>
            <Text style={[styles.thinkingLabel, webSearchEnabled && styles.thinkingLabelActive]}>
              {t('ai.webSearch')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.thinkingToggle, thinkingEnabled && styles.thinkingToggleActive]}
            onPress={() => setThinkingEnabled(!thinkingEnabled)}
            activeOpacity={0.7}
          >
            <Text style={styles.thinkingEmoji}>🧠</Text>
            <Text style={[styles.thinkingLabel, thinkingEnabled && styles.thinkingLabelActive]}>
              {t('ai.deepThinking')}
            </Text>
          </TouchableOpacity>
          {messages.length > 0 ? (
            <Text style={styles.newChatBtn} onPress={clearMessages}>
              {t('ai.newChat')}
            </Text>
          ) : null}
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="always"
        nestedScrollEnabled
      >
        {messages.length === 0 ? (
          <Animated.View style={[styles.welcomeContainer, { opacity: headerOpacity }]}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>🤖</Text>
            </View>
            <Text style={styles.welcomeTitle}>{t('ai.title')}</Text>
            <Text style={styles.welcomeSubtitle}>{t('ai.welcomeSubtitle')}</Text>

            <View style={styles.featureRow}>
              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>📷</Text>
                <Text style={styles.featureText}>{t('ai.multimodal')}</Text>
              </View>
              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>🌐</Text>
                <Text style={styles.featureText}>{t('ai.webSearch')}</Text>
              </View>
            </View>

            <QuickQuestions onSelect={handleSend} />
          </Animated.View>
        ) : null}

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

        {isStreaming ? (
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
        ) : null}
      </ScrollView>

      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </View>
  );
}
