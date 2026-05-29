// apps/server/src/modules/ai/search.service.ts
import { Injectable, Logger } from '@nestjs/common';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  async search(query: string, limit = 5): Promise<SearchResult[]> {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' 美食 推荐')}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EconomicBot/1.0)' },
      });
      const html = await response.text();
      return this.parseHtmlResults(html, limit);
    } catch (error) {
      this.logger.error('Web search failed', error);
      return [];
    }
  }

  private parseHtmlResults(html: string, limit: number): SearchResult[] {
    const results: SearchResult[] = [];
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/g;
    let match;
    while ((match = resultRegex.exec(html)) && results.length < limit) {
      results.push({
        url: match[1],
        title: this.stripHtml(match[2]),
        snippet: this.stripHtml(match[3]),
      });
    }
    return results;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }
}
