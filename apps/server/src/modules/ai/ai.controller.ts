// apps/server/src/modules/ai/ai.controller.ts
import { Controller, Post, Get, Body, Param, Logger, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';

type FlushableResponse = Response & { flush?: () => void };
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(
    private readonly aiService: AiService,
  ) {}

  @Post('chat')
  async chat(
    @CurrentUser() user: any,
    @Body() dto: ChatDto,
    @Res() res: FlushableResponse,
  ) {
    this.logger.log(`AI chat request: user=${user.id}, message=${dto.message?.slice(0, 50)}`);
    try {
      const { stream, conversationId, searchResults } = await this.aiService.chat(
        user.id,
        dto.message,
        dto.conversationId,
        dto.thinkingEnabled,
        dto.imageUrl,
        dto.webSearch,
      );

      // SSE headers — manual response, bypass global JSON interceptor
      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      if (searchResults?.length) {
        res.write(
          `data: ${JSON.stringify({ type: 'search', searchResults, conversationId })}\n\n`,
        );
        if (typeof res.flush === 'function') res.flush();
      }

      let fullContent = '';
      let fullThinking = '';
      const aiService = this.aiService;

      const body = stream.body;
      if (!body) {
        res.write(`data: ${JSON.stringify({ error: 'AI 服务不可用' })}\n\n`);
        res.end();
        return;
      }

      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const payload = trimmed.slice(6);
            if (payload === '[DONE]') continue;

            try {
              const json = JSON.parse(payload);
              // Parse thinking tokens (reasoning_content) from DeepSeek-R1
              const reasoningContent = json.choices?.[0]?.delta?.reasoning_content;
              if (reasoningContent) {
                fullThinking += reasoningContent;
                res.write(`data: ${JSON.stringify({ type: 'thinking', thinkingChunk: reasoningContent, conversationId })}\n\n`);
                if (typeof res.flush === 'function') res.flush();
              }
              // Parse regular content tokens
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
                res.write(`data: ${JSON.stringify({ type: 'chunk', chunk: content, conversationId })}\n\n`);
                if (typeof res.flush === 'function') res.flush();
              }
            } catch {}
          }
        }

        await aiService.saveAssistantMessage(conversationId, fullContent, fullThinking || undefined);
        res.write(`data: ${JSON.stringify({ done: true, conversationId })}\n\n`);
        if (typeof res.flush === 'function') res.flush();
        res.end();
      } catch (err: any) {
        console.error('AI stream read error:', err?.message);
        res.write(`data: ${JSON.stringify({ error: err?.message || 'AI 服务暂时不可用' })}\n\n`);
        res.end();
      }
    } catch (error: any) {
      this.logger.error('AI chat 失败', error?.stack || error);
      const message = error?.message || 'AI 服务暂时不可用';
      if (!res.headersSent) {
        res.status(500).json({ code: 500, message });
      }
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
