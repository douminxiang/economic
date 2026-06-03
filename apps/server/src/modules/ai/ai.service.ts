// apps/server/src/modules/ai/ai.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';
import { SearchService, SearchResult } from './search.service';
import { UploadService } from '../upload/upload.service';

const AI_BASE_URL = 'https://api.siliconflow.cn';
const AI_MODEL_DEFAULT = 'deepseek-ai/DeepSeek-V3.2';
const AI_MODEL_THINKING = 'deepseek-ai/DeepSeek-R1';
const AI_MODEL_VISION = process.env.AI_VISION_MODEL || 'Qwen/Qwen3-VL-8B-Instruct';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private prisma: PrismaService,
    private embeddingService: EmbeddingService,
    private searchService: SearchService,
    private uploadService: UploadService,
  ) {}

  async chat(userId: number, message: string, conversationId?: number, thinkingEnabled?: boolean, imageUrl?: string, webSearch?: boolean) {
    this.logger.log(`AI chat: userId=${userId}, message=${message?.slice(0, 50)}, conversationId=${conversationId}, thinking=${thinkingEnabled}, imageUrl=${imageUrl}, webSearch=${webSearch}`);

    if (imageUrl) {
      this.assertOssImageUrl(imageUrl);
    }
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
      data: { conversationId: conversation.id, role: 'user', content: message, imageUrl: imageUrl || null },
    });

    const historyRaw = await this.prisma.aIMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    const history = historyRaw.reverse();

    const messages: any[] = await Promise.all(
      history.map(async (m) => {
        if (m.role === 'user' && m.imageUrl) {
          const resolvedUrl = await this.resolveImageForModel(m.imageUrl);
          return {
            role: 'user',
            content: [
              { type: 'text', text: m.content },
              { type: 'image_url', image_url: { url: resolvedUrl } },
            ],
          };
        }
        return {
          role: m.role as 'user' | 'assistant',
          content: m.content,
        };
      }),
    );

    const dbContext = await this.buildDbContext(message);

    let searchResults: SearchResult[] = [];
    if (webSearch) {
      try {
        searchResults = await this.searchService.search(message, 5);
      } catch (error) {
        this.logger.warn('Web search failed', error);
      }
    }

    const hasImage = history.some((m) => m.role === 'user' && m.imageUrl);
    const systemPrompt = this.buildSystemPrompt(dbContext, searchResults, hasImage);

    const model = hasImage
      ? AI_MODEL_VISION
      : thinkingEnabled
        ? AI_MODEL_THINKING
        : AI_MODEL_DEFAULT;
    const requestBody: any = {
      model,
      max_tokens: hasImage ? 1024 : thinkingEnabled ? 4096 : 1024,
      temperature: thinkingEnabled && !hasImage ? 0.6 : undefined,
      stream: true,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    };

    const response = await fetch(`${AI_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ANTHROPIC_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      this.logger.error(`AI API error: ${response.status} ${errText}`);
      let detail = errText;
      try {
        const parsed = JSON.parse(errText);
        detail = parsed.message || parsed.error?.message || errText;
      } catch {
        // keep raw text
      }
      throw new Error(detail || `AI 服务调用失败 (${response.status})`);
    }

    return { stream: response, conversationId: conversation.id, searchResults };
  }

  /** 多模态对话图片须为 OSS 公网 HTTPS 地址 */
  private assertOssImageUrl(imageUrl: string) {
    if (this.uploadService.isOssPublicUrl(imageUrl)) return;
    throw new BadRequestException('多模态对话图片须上传至 OSS，请重新选择图片');
  }

  /** OSS 公网 URL 可直接传给视觉模型；本地 Mock 文件转为 base64 */
  private async resolveImageForModel(imageUrl: string): Promise<string> {
    if (imageUrl.startsWith('data:')) return imageUrl;

    if (this.uploadService.isOssPublicUrl(imageUrl)) {
      return imageUrl;
    }

    const uploadsMatch = imageUrl.match(/\/uploads\/([^/?#]+)$/);
    if (uploadsMatch) {
      const filepath = path.join(process.cwd(), 'uploads', uploadsMatch[1]);
      if (fs.existsSync(filepath)) {
        const buffer = fs.readFileSync(filepath);
        const ext = path.extname(uploadsMatch[1]).toLowerCase();
        const mime =
          ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        return `data:${mime};base64,${buffer.toString('base64')}`;
      }
    }

    try {
      const response = await fetch(imageUrl);
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        return `data:${contentType};base64,${buffer.toString('base64')}`;
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch image ${imageUrl}`, error);
    }

    return imageUrl;
  }

  private async buildDbContext(userMessage: string): Promise<string> {
    try {
      // Try hybrid vector + keyword search first
      let shops: any[];
      try {
        shops = await this.embeddingService.hybridSearch(userMessage, 10);
      } catch (embeddingError) {
        // Fallback to keyword-based search if embedding fails
        this.logger.warn('Embedding search failed, falling back to keyword search', embeddingError);
        shops = await this.keywordSearch(userMessage);
      }

      if (shops.length === 0) {
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

  private async keywordSearch(userMessage: string): Promise<any[]> {
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

    return this.prisma.shop.findMany({
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
  }

  private formatShopData(shops: any[]): string {
    if (shops.length === 0) return '';

    const lines = shops.map((shop) => {
      const products = shop.products
        ?.map((p: any) => `${p.name}(${Number(p.price)}元)`)
        .join('、') || '暂无菜品信息';

      return [
        `- [id:${shop.id}] ${shop.name}`,
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

  private buildSystemPrompt(
    dbContext: string,
    searchResults: SearchResult[] = [],
    hasImage = false,
  ): string {
    let webContext = '';
    if (searchResults.length > 0) {
      const lines = searchResults.map(
        (r) => `- **${r.title}**: ${r.snippet}\n  来源: ${r.url}`,
      );
      webContext = `\n\n## 联网搜索参考\n${lines.join('\n')}\n\n请结合以上联网信息与平台商家数据回答，可引用来源链接。`;
    }

    const imageHint = hasImage
      ? `\n## 图片理解\n用户发送了美食图片，请先描述图片中的菜品/场景，再结合平台数据推荐相似餐厅或搭配。`
      : '';

    return `你是"美食达人AI"，一个专业的本地美食推荐助手。你的任务是帮助用户发现好吃的餐厅和美食。

## 你的能力
- 根据用户需求（菜系、价位、场景、口味）推荐餐厅
- 介绍餐厅的特色菜品、价格、评分、地址
- 根据用户的位置推荐附近的商家
- 回答关于美食和本地生活的问题
- 识别用户上传的美食图片并给出推荐

## 推荐格式
当你推荐餐厅时，请用以下结构化格式（每家餐厅用 🍽️ 开头，必须包含 shopId 且名称与数据库一致）：

🍽️ **餐厅名称**
shopId: 123
📍 地址：xxx
💰 人均：xx元
⭐ 评分：x.x
🔥 招牌菜：xxx、xxx
💬 推荐理由：xxx

shopId 必须来自上文商家数据中的 [id:数字]，不可编造。

## 回复规则
1. 优先推荐数据库中的真实商家，不要编造不存在的餐厅
2. 推荐理由要具体生动，比如"他家的红烧肉肥而不腻，入口即化"
3. 每次推荐 2-4 家，信息要准确有用
4. 如果数据库中没有匹配的商家，如实告知并给出一般性建议
5. 回答用中文，语气热情友好，像朋友推荐一样自然
6. 用 emoji 让回复更生动 🍜🍕🥩
${imageHint}${dbContext}${webContext}`;
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

  async saveAssistantMessage(conversationId: number, content: string, thinking?: string) {
    return this.prisma.aIMessage.create({
      data: { conversationId, role: 'assistant', content, thinking: thinking || null },
    });
  }
}
