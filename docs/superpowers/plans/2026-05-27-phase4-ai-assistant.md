# Phase 4: AI 智能助手 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现 AI 智能对话助手，通过 Claude API 为用户提供本地生活服务推荐、订单查询等智能交互体验。

**架构：** 后端使用 NestJS 模块封装 Claude API 调用，通过 SSE 流式返回响应；前端使用 React Native 实现聊天界面，支持消息气泡、快捷问题、流式渲染。

**技术栈：** NestJS, Prisma, Claude API (@anthropic-ai/sdk), React Native, TanStack Query, Zustand

---

## 文件结构

### 后端新增文件

| 文件 | 职责 |
|------|------|
| `apps/server/prisma/schema.prisma` | 添加 AIConversation, AIMessage 模型 |
| `apps/server/src/modules/ai/ai.module.ts` | AI 模块定义 |
| `apps/server/src/modules/ai/ai.controller.ts` | AI 接口控制器 (SSE) |
| `apps/server/src/modules/ai/ai.service.ts` | AI 业务逻辑 (Claude API 调用) |
| `apps/server/src/modules/ai/dto/chat.dto.ts` | 发送消息 DTO |
| `apps/server/src/modules/ai/types.ts` | 类型定义 |

### 前端新增/修改文件

| 文件 | 职责 |
|------|------|
| `apps/mobile/src/screens/AIScreen.tsx` | AI 对话主界面 (重写) |
| `apps/mobile/src/screens/AIRecommendScreen.tsx` | AI 推荐结果页 |
| `apps/mobile/src/components/ai/ChatBubble.tsx` | 消息气泡组件 |
| `apps/mobile/src/components/ai/QuickQuestions.tsx` | 快捷问题组件 |
| `apps/mobile/src/components/ai/ChatInput.tsx` | 输入框组件 |
| `apps/mobile/src/components/ai/ShopCard.tsx` | 商家推荐卡片 |
| `apps/mobile/src/services/api.ts` | 添加 AI API |
| `apps/mobile/src/stores/aiStore.ts` | AI 状态管理 |

---

## 任务 1: 更新 Prisma Schema - 添加 AI 模型

**文件：**
- 修改：`apps/server/prisma/schema.prisma`

- [ ] **步骤 1: 在 schema.prisma 末尾添加 AI 模型**

```prisma
// ============ AI 对话 ============

model AIConversation {
  id        Int      @id @default(autoincrement())
  userId    Int
  title     String?  @db.VarChar(100)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user    User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages AIMessage[]

  @@index([userId])
  @@map("ai_conversations")
}

model AIMessage {
  id             Int      @id @default(autoincrement())
  conversationId Int
  role           String   @db.VarChar(20) // 'user' | 'assistant'
  content        Text
  createdAt      DateTime @default(now())

  conversation AIConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
  @@map("ai_messages")
}
```

- [ ] **步骤 2: 在 User 模型中添加关系**

在 `apps/server/prisma/schema.prisma` 的 User 模型中添加：
```prisma
  aiConversations AIConversation[]
```

- [ ] **步骤 3: 运行 Prisma 迁移**

```bash
cd apps/server
npx prisma migrate dev --name add-ai-models
```

预期：迁移成功，创建 ai_conversations 和 ai_messages 表

- [ ] **步骤 4: Commit**

```bash
git add apps/server/prisma/schema.prisma
git commit -m "feat: add AI conversation models to Prisma schema"
```

---

## 任务 2: 创建 AI 模块 - 基础结构

**文件：**
- 创建：`apps/server/src/modules/ai/types.ts`
- 创建：`apps/server/src/modules/ai/dto/chat.dto.ts`
- 创建：`apps/server/src/modules/ai/ai.module.ts`

- [ ] **步骤 1: 创建类型定义文件**

```typescript
// apps/server/src/modules/ai/types.ts
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  conversationId: number;
  content: string;
}
```

- [ ] **步骤 2: 创建 DTO**

```typescript
// apps/server/src/modules/ai/dto/chat.dto.ts
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class ChatDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsNumber()
  conversationId?: number;
}
```

- [ ] **步骤 3: 创建 AI 模块**

```typescript
// apps/server/src/modules/ai/ai.module.ts
import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
```

- [ ] **步骤 4: Commit**

```bash
git add apps/server/src/modules/ai/
git commit -m "feat: create AI module structure"
```

---

## 任务 3: 实现 AI Service - Claude API 集成

**文件：**
- 创建：`apps/server/src/modules/ai/ai.service.ts`

- [ ] **步骤 1: 创建 AI Service**

```typescript
// apps/server/src/modules/ai/ai.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Anthropic from '@anthropic-ai/sdk';
import { ChatMessage } from './types';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private anthropic: Anthropic;

  constructor(private prisma: PrismaService) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async chat(userId: number, message: string, conversationId?: number) {
    // 1. 加载或创建对话
    const conversation = conversationId
      ? await this.prisma.aIConversation.findUnique({ where: { id: conversationId } })
      : await this.prisma.aIConversation.create({
          data: { userId, title: message.slice(0, 50) },
        });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // 2. 保存用户消息
    await this.prisma.aIMessage.create({
      data: { conversationId: conversation.id, role: 'user', content: message },
    });

    // 3. 获取历史消息（最近 10 条）
    const history = await this.prisma.aIMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    const messages: ChatMessage[] = history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // 4. 构建 System Prompt
    const systemPrompt = this.buildSystemPrompt(userId);

    // 5. 调用 Claude API (stream)
    const stream = this.anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    return { stream, conversationId: conversation.id };
  }

  private buildSystemPrompt(userId: number): string {
    return `你是一个本地生活服务智能助手。你可以帮助用户：
- 查找附近的餐厅、商店
- 推荐美食和商家
- 查询订单状态
- 回答关于本地生活服务的问题

请用简洁友好的中文回答。如果需要推荐商家，请提供商家名称、评分、人均消费和距离等信息。`;
  }

  async getHistory(userId: number) {
    return this.prisma.aIConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
  }

  async getMessages(conversationId: number, userId: number) {
    const conversation = await this.prisma.aIConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.userId !== userId) {
      throw new Error('Conversation not found');
    }

    return this.prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async saveAssistantMessage(conversationId: number, content: string) {
    return this.prisma.aIMessage.create({
      data: { conversationId, role: 'assistant', content },
    });
  }
}
```

- [ ] **步骤 2: Commit**

```bash
git add apps/server/src/modules/ai/ai.service.ts
git commit -m "feat: implement AI service with Claude API integration"
```

---

## 任务 4: 实现 AI Controller - SSE 流式响应

**文件：**
- 创建：`apps/server/src/modules/ai/ai.controller.ts`

- [ ] **步骤 1: 创建 AI Controller**

```typescript
// apps/server/src/modules/ai/ai.controller.ts
import { Controller, Post, Get, Body, Param, Req, Res, Sse } from '@nestjs/common';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { Request, Response } from 'express';
import { Observable, Subscriber } from 'rxjs';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(
    @CurrentUser() user: any,
    @Body() dto: ChatDto,
    @Res() res: Response,
  ) {
    try {
      const { stream, conversationId } = await this.aiService.chat(
        user.id,
        dto.message,
        dto.conversationId,
      );

      // 设置 SSE 头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Conversation-Id', conversationId.toString());

      let fullContent = '';

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const chunk = event.delta.text;
          fullContent += chunk;
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
      }

      // 保存完整响应
      await this.aiService.saveAssistantMessage(conversationId, fullContent);

      res.write(`data: ${JSON.stringify({ done: true, conversationId })}\n\n`);
      res.end();
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }

  @Get('history')
  async getHistory(@CurrentUser() user: any) {
    return this.aiService.getHistory(user.id);
  }

  @Get('conversation/:id')
  async getMessages(@CurrentUser() user: any, @Param('id') id: string) {
    return this.aiService.getMessages(parseInt(id), user.id);
  }
}
```

- [ ] **步骤 2: 在 AppModule 中注册 AI 模块**

修改 `apps/server/src/app.module.ts`，添加：
```typescript
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    // ... 其他模块
    AiModule,
  ],
})
```

- [ ] **步骤 3: 添加环境变量**

在 `apps/server/.env` 中添加：
```
ANTHROPIC_API_KEY=your_api_key_here
```

- [ ] **步骤 4: Commit**

```bash
git add apps/server/src/modules/ai/ai.controller.ts apps/server/src/app.module.ts
git commit -m "feat: implement AI controller with SSE streaming"
```

---

## 任务 5: 前端 - AI API 服务

**文件：**
- 修改：`apps/mobile/src/services/api.ts`

- [ ] **步骤 1: 添加 AI API**

在 `apps/mobile/src/services/api.ts` 末尾添加：
```typescript
// ============ AI 助手 ============
export const aiApi = {
  chat: (message: string, conversationId?: number) => {
    return api.post('/ai/chat', { message, conversationId });
  },
  history: () => api.get('/ai/history'),
  messages: (conversationId: number) => api.get(`/ai/conversation/${conversationId}`),
};
```

- [ ] **步骤 2: 创建 SSE 工具函数**

在 `apps/mobile/src/services/api.ts` 末尾添加：
```typescript
// SSE Stream Helper
export const createChatStream = async (
  message: string,
  conversationId: number | undefined,
  onChunk: (chunk: string) => void,
  onDone: (conversationId: number) => void,
  onError: (error: string) => void,
) => {
  const token = storage.getString('accessToken');
  const response = await fetch('http://10.0.2.2:3000/api/v1/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, conversationId }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    onError('Failed to create stream');
    return;
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.chunk) {
            onChunk(data.chunk);
          } else if (data.done) {
            onDone(data.conversationId);
          } else if (data.error) {
            onError(data.error);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }
};
```

- [ ] **步骤 3: Commit**

```bash
git add apps/mobile/src/services/api.ts
git commit -m "feat: add AI API and SSE stream helper"
```

---

## 任务 6: 前端 - AI 状态管理

**文件：**
- 创建：`apps/mobile/src/stores/aiStore.ts`

- [ ] **步骤 1: 创建 Zustand Store**

```typescript
// apps/mobile/src/stores/aiStore.ts
import { create } from 'zustand';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

interface AIState {
  conversations: any[];
  currentConversationId: number | null;
  messages: AIMessage[];
  isStreaming: boolean;
  setConversations: (conversations: any[]) => void;
  setCurrentConversation: (id: number | null) => void;
  setMessages: (messages: AIMessage[]) => void;
  addUserMessage: (content: string) => void;
  addAssistantMessage: (content: string) => void;
  updateLastAssistantMessage: (content: string) => void;
  setStreaming: (streaming: boolean) => void;
  clearMessages: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  isStreaming: false,

  setConversations: (conversations) => set({ conversations }),
  setCurrentConversation: (id) => set({ currentConversationId: id }),
  setMessages: (messages) => set({ messages }),

  addUserMessage: (content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { id: `user-${Date.now()}`, role: 'user', content },
      ],
    })),

  addAssistantMessage: (content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { id: `assistant-${Date.now()}`, role: 'assistant', content },
      ],
    })),

  updateLastAssistantMessage: (content) =>
    set((state) => {
      const messages = [...state.messages];
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant') {
        messages[messages.length - 1] = { ...lastMsg, content };
      }
      return { messages };
    }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  clearMessages: () => set({ messages: [], currentConversationId: null }),
}));
```

- [ ] **步骤 2: Commit**

```bash
git add apps/mobile/src/stores/aiStore.ts
git commit -m "feat: create AI Zustand store"
```

---

## 任务 7: 前端 - ChatBubble 组件

**文件：**
- 创建：`apps/mobile/src/components/ai/ChatBubble.tsx`

- [ ] **步骤 1: 创建消息气泡组件**

```tsx
// apps/mobile/src/components/ai/ChatBubble.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../../theme/tokens';

interface Props {
  role: 'user' | 'assistant';
  content: string;
}

export const ChatBubble: React.FC<Props> = ({ role, content }) => {
  const isUser = role === 'user';

  return (
    <View style={[styles.container, isUser && styles.userContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.text, isUser && styles.userText]}>{content}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: borderRadius.xs,
  },
  assistantBubble: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: borderRadius.xs,
  },
  text: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 20,
  },
  userText: {
    color: colors.white,
  },
});
```

- [ ] **步骤 2: Commit**

```bash
git add apps/mobile/src/components/ai/ChatBubble.tsx
git commit -m "feat: create ChatBubble component"
```

---

## 任务 8: 前端 - QuickQuestions 组件

**文件：**
- 创建：`apps/mobile/src/components/ai/QuickQuestions.tsx`

- [ ] **步骤 1: 创建快捷问题组件**

```tsx
// apps/mobile/src/components/ai/QuickQuestions.tsx
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
```

- [ ] **步骤 2: Commit**

```bash
git add apps/mobile/src/components/ai/QuickQuestions.tsx
git commit -m "feat: create QuickQuestions component"
```

---

## 任务 9: 前端 - ChatInput 组件

**文件：**
- 创建：`apps/mobile/src/components/ai/ChatInput.tsx`

- [ ] **步骤 1: 创建输入框组件**

```tsx
// apps/mobile/src/components/ai/ChatInput.tsx
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, fontSize, spacing, borderRadius } from '../../theme/tokens';

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<Props> = ({ onSend, disabled }) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText('');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="输入你的问题..."
          placeholderTextColor={colors.textLight}
          multiline
          maxLength={500}
          editable={!disabled}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!text.trim() || disabled) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || disabled}
        >
          <Icon name="send" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    fontSize: fontSize.md,
    color: colors.text,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.textLight,
  },
});
```

- [ ] **步骤 2: Commit**

```bash
git add apps/mobile/src/components/ai/ChatInput.tsx
git commit -m "feat: create ChatInput component"
```

---

## 任务 10: 前端 - 重写 AIScreen 主界面

**文件：**
- 修改：`apps/mobile/src/screens/AIScreen.tsx`

- [ ] **步骤 1: 重写 AI 对话主界面**

```tsx
// apps/mobile/src/screens/AIScreen.tsx
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
                content="👋 你好！我是本地生活智能助手\n\n我可以帮你：\n• 查找附近好店\n• 推荐美食\n• 查看订单状态"
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
```

- [ ] **步骤 2: Commit**

```bash
git add apps/mobile/src/screens/AIScreen.tsx
git commit -m "feat: rewrite AIScreen with chat interface"
```

---

## 任务 11: 测试与验证

**文件：**
- 无新增文件

- [ ] **步骤 1: 启动后端服务**

```bash
cd apps/server
npm run start:dev
```

预期：服务启动成功，无报错

- [ ] **步骤 2: 测试 AI API**

```bash
curl -X POST http://localhost:3000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"message": "附近有什么好吃的？"}'
```

预期：SSE 流式响应，返回 AI 推荐内容

- [ ] **步骤 3: 启动前端应用**

```bash
cd apps/mobile
npm run android
```

预期：应用启动，AI 助手 Tab 可正常显示

- [ ] **步骤 4: 测试 AI 对话功能**

1. 打开 AI 助手 Tab
2. 点击快捷问题或输入消息
3. 观察流式响应效果
4. 验证消息气泡显示正确

- [ ] **步骤 5: Commit 测试修复**

如有问题，修复后提交：
```bash
git add -A
git commit -m "fix: AI assistant bug fixes"
```

---

## 任务 12: 完成与清理

- [ ] **步骤 1: 更新 Todo 列表**

标记所有任务完成

- [ ] **步骤 2: 最终 Commit**

```bash
git add -A
git commit -m "feat: complete Phase 4 AI assistant implementation"
```

---

## 自检清单

- [x] Prisma schema 包含 AIConversation 和 AIMessage 模型
- [x] AI Service 实现 Claude API 调用和历史管理
- [x] AI Controller 支持 SSE 流式响应
- [x] 前端 API 添加 AI 接口和 SSE 工具
- [x] Zustand Store 管理 AI 状态
- [x] ChatBubble 组件支持用户/AI 消息
- [x] QuickQuestions 组件显示快捷问题
- [x] ChatInput 组件支持输入和发送
- [x] AIScreen 集成所有组件实现完整对话
- [x] 所有代码遵循现有模式和规范
