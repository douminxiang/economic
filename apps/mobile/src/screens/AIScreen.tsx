import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Animated } from 'react-native';
import { useStore } from 'zustand';
import { ChatBubble } from '../components/ai/ChatBubble';
import { QuickQuestions } from '../components/ai/QuickQuestions';
import { ChatInput } from '../components/ai/ChatInput';
import { useAIStore, AIMessage } from '../stores/aiStore';
import { createChatStream } from '../services/api';
import { colors, spacing, fontSize, borderRadius } from '../theme/tokens';

export default function AIScreen() {
  const flatListRef = useRef<FlatList>(null);
  const headerOpacity = useRef(new Animated.Value(0)).current;

  const messages = useStore(useAIStore, (s) => s.messages);
  const isStreaming = useStore(useAIStore, (s) => s.isStreaming);
  const currentConversationId = useStore(useAIStore, (s) => s.currentConversationId);
  const addUserMessage = useStore(useAIStore, (s) => s.addUserMessage);
  const addAssistantMessage = useStore(useAIStore, (s) => s.addAssistantMessage);
  const updateLastAssistantMessage = useStore(useAIStore, (s) => s.updateLastAssistantMessage);
  const setStreaming = useStore(useAIStore, (s) => s.setStreaming);
  const setCurrentConversation = useStore(useAIStore, (s) => s.setCurrentConversation);
  const clearMessages = useStore(useAIStore, (s) => s.clearMessages);

  useEffect(() => {
    Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    clearMessages();
  }, []);

  useEffect(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const handleSend = useCallback(async (content: string) => {
    addUserMessage(content);
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
        updateLastAssistantMessage(`抱歉，出了点问题：${error}`);
        setStreaming(false);
      },
    );
  }, [currentConversationId]);

  const renderWelcome = () => (
    <Animated.View style={[styles.welcomeContainer, { opacity: headerOpacity }]}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarEmoji}>🤖</Text>
      </View>
      <Text style={styles.welcomeTitle}>美食达人AI</Text>
      <Text style={styles.welcomeSubtitle}>告诉我你想吃什么，我来帮你找好店</Text>

      <View style={styles.featureRow}>
        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>🔍</Text>
          <Text style={styles.featureText}>智能搜索</Text>
        </View>
        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>⭐</Text>
          <Text style={styles.featureText}>精选推荐</Text>
        </View>
        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>📍</Text>
          <Text style={styles.featureText}>附近好店</Text>
        </View>
      </View>

      <QuickQuestions onSelect={handleSend} />
    </Animated.View>
  );

  const renderItem = ({ item }: { item: AIMessage }) => (
    <ChatBubble role={item.role} content={item.content} />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerDot} />
          <Text style={styles.headerTitle}>美食达人AI</Text>
        </View>
        {messages.length > 0 && (
          <Text style={styles.newChatBtn} onPress={clearMessages}>新对话</Text>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={messages.length === 0 ? renderWelcome : null}
        ListFooterComponent={
          isStreaming ? (
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
          ) : null
        }
      />

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
  headerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  newChatBtn: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '500' },
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
