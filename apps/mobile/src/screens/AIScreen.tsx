import React, { useEffect, useRef } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { ChatBubble } from '../components/ai/ChatBubble';
import { QuickQuestions } from '../components/ai/QuickQuestions';
import { ChatInput } from '../components/ai/ChatInput';
import { useAIStore, AIMessage } from '../stores/aiStore';
import { createChatStream } from '../services/api';
import { colors, spacing } from '../theme/tokens';

export default function AIScreen() {
  const flatListRef = useRef<FlatList>(null);
  const {
    messages,
    isStreaming,
    currentConversationId,
    addUserMessage,
    addAssistantMessage,
    updateLastAssistantMessage,
    setStreaming,
    setCurrentConversation,
  } = useAIStore();

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = async (content: string) => {
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
        updateLastAssistantMessage(`错误: ${error}`);
        setStreaming(false);
      },
    );
  };

  const renderItem = ({ item }: { item: AIMessage }) => (
    <ChatBubble role={item.role} content={item.content} />
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          messages.length === 0 ? (
            <View>
              <ChatBubble
                role="assistant"
                content="你好！我是本地生活智能助手\n\n我可以帮你：\n查找附近好店\n推荐美食\n查看订单状态"
              />
              <QuickQuestions onSelect={handleSend} />
            </View>
          ) : null
        }
        ListFooterComponent={
          isStreaming ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingBottom: spacing.md,
  },
  loading: {
    padding: spacing.md,
    alignItems: 'center',
  },
});
