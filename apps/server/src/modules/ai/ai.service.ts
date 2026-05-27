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
