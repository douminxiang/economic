// apps/server/src/modules/ai/ai.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
    const conversation = conversationId
      ? await this.prisma.aIConversation.findFirst({
          where: { id: conversationId, userId },
        })
      : await this.prisma.aIConversation.create({
          data: { userId, title: message.slice(0, 50) },
        });

    if (!conversation) {
      throw new NotFoundException('会话不存在');
    }

    await this.prisma.aIMessage.create({
      data: { conversationId: conversation.id, role: 'user', content: message },
    });

    const historyRaw = await this.prisma.aIMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    const history = historyRaw.reverse();

    const messages: ChatMessage[] = history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Query real restaurant data from DB
    const dbContext = await this.buildDbContext(message);
    const systemPrompt = this.buildSystemPrompt(dbContext);

    try {
      const stream = this.anthropic.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      });
      return { stream, conversationId: conversation.id };
    } catch (error) {
      this.logger.error('Claude API 调用失败', error);
      throw error;
    }
  }

  private async buildDbContext(userMessage: string): Promise<string> {
    try {
      // Search shops by name, category, or address keywords
      const keywords = userMessage
        .replace(/[？！。，、\.\!\?\,\s]+/g, ' ')
        .trim()
        .split(' ')
        .filter((w) => w.length >= 1);

      const conditions: any[] = [];

      for (const kw of keywords) {
        conditions.push(
          { name: { contains: kw } },
          { address: { contains: kw } },
          { category: { name: { contains: kw } } },
          { products: { some: { name: { contains: kw } } } },
        );
      }

      const shops = await this.prisma.shop.findMany({
        where: {
          status: 1,
          ...(conditions.length > 0 ? { OR: conditions } : {}),
        },
        include: {
          category: true,
          products: { where: { status: 1 }, take: 5, orderBy: { sales: 'desc' } },
        },
        take: 10,
        orderBy: { rating: 'desc' },
      });

      if (shops.length === 0) {
        // Fallback: return top-rated shops
        const topShops = await this.prisma.shop.findMany({
          where: { status: 1 },
          include: {
            category: true,
            products: { where: { status: 1 }, take: 3, orderBy: { sales: 'desc' } },
          },
          take: 8,
          orderBy: [{ monthlySales: 'desc' }, { rating: 'desc' }],
        });
        return this.formatShopData(topShops);
      }

      return this.formatShopData(shops);
    } catch (error) {
      this.logger.error('查询商家数据失败', error);
      return '';
    }
  }

  private formatShopData(shops: any[]): string {
    if (shops.length === 0) return '';

    const lines = shops.map((shop) => {
      const products = shop.products
        ?.map((p: any) => `${p.name}(${Number(p.price)}元)`)
        .join('、') || '暂无菜品信息';

      return [
        `- ${shop.name}`,
        `  地址：${shop.address}`,
        `  分类：${shop.category?.name || '未分类'}`,
        `  评分：${Number(shop.rating)}`,
        `  月售：${shop.monthlySales}单`,
        `  人均：${Number(shop.minOrder)}元起`,
        `  配送费：${Number(shop.deliveryFee)}元`,
        `  营业时间：${shop.businessHours || '09:00-22:00'}`,
        `  招牌菜：${products}`,
      ].join('\n');
    });

    return `\n以下是平台上的真实商家数据，请基于这些数据进行推荐：\n${lines.join('\n\n')}`;
  }

  private buildSystemPrompt(dbContext: string): string {
    return `你是"美食达人AI"，一个专业的本地美食推荐助手。你的任务是帮助用户发现好吃的餐厅和美食。

## 你的能力
- 根据用户需求（菜系、价位、场景、口味）推荐餐厅
- 介绍餐厅的特色菜品、价格、评分、地址
- 根据用户的位置推荐附近的商家
- 回答关于美食和本地生活的问题

## 推荐格式
当你推荐餐厅时，请用以下结构化格式（每家餐厅用 🍽️ 开头）：

🍽️ **餐厅名称**
📍 地址：xxx
💰 人均：xx元
⭐ 评分：x.x
🔥 招牌菜：xxx、xxx
💬 推荐理由：xxx

## 回复规则
1. 优先推荐数据库中的真实商家，不要编造不存在的餐厅
2. 推荐理由要具体生动，比如"他家的红烧肉肥而不腻，入口即化"
3. 每次推荐 2-4 家，信息要准确有用
4. 如果数据库中没有匹配的商家，如实告知并给出一般性建议
5. 回答用中文，语气热情友好，像朋友推荐一样自然
6. 用 emoji 让回复更生动 🍜🍕🥩
${dbContext}`;
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
      throw new NotFoundException('会话不存在');
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
