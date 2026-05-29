import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const EMBEDDING_URL = 'https://api.siliconflow.cn/v1/embeddings';
const EMBEDDING_MODEL = 'BAAI/bge-large-zh-v1.5';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  constructor(private prisma: PrismaService) {}

  async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const response = await fetch(EMBEDDING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
        encoding_format: 'float',
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      this.logger.error(`Embedding API error: ${err}`);
      throw new Error(`Embedding failed: ${response.status}`);
    }
    const data = await response.json();
    return data.data[0].embedding;
  }

  cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  private keywordScore(shop: any, keywords: string[]): number {
    if (keywords.length === 0) return 0;
    let score = 0;
    const text = `${shop.name} ${shop.address} ${shop.category?.name || ''}`;
    for (const kw of keywords) {
      if (shop.name.includes(kw)) score += 1;
      else if (text.includes(kw)) score += 0.5;
    }
    return Math.min(score / keywords.length, 1.0);
  }

  async hybridSearch(userMessage: string, limit = 10): Promise<any[]> {
    const queryEmbedding = await this.generateEmbedding(userMessage);
    const keywords = userMessage
      .replace(/[？！。，、\.\!\?\,\s]+/g, ' ')
      .trim().split(' ').filter(w => w.length >= 1);

    const shops = await this.prisma.shop.findMany({
      where: { status: 1, embedding: { not: null } },
      include: {
        category: true,
        products: { where: { status: 1 }, take: 5, orderBy: { sales: 'desc' } },
      },
    });

    const scored = shops.map(shop => {
      const vecScore = shop.embedding
        ? this.cosineSimilarity(queryEmbedding, shop.embedding as number[])
        : 0;
      const kwScore = this.keywordScore(shop, keywords);
      return { ...shop, _score: vecScore * 0.7 + kwScore * 0.3 };
    });

    scored.sort((a, b) => b._score - a._score);
    return scored.slice(0, limit);
  }
}
