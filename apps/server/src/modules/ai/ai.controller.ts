// apps/server/src/modules/ai/ai.controller.ts
import { Controller, Post, Get, Body, Param, Logger, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';

type FlushableResponse = Response & { flush?: () => void };
import { AiService } from './ai.service';
import { SearchService } from './search.service';
import { ChatDto } from './dto/chat.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(
    private readonly aiService: AiService,
    private readonly searchService: SearchService,
  ) {}

  @Post('chat')
  async chat(
    @CurrentUser() user: any,
    @Body() dto: ChatDto,
    @Res() res: FlushableResponse,
  ) {
    this.logger.log(`AI chat request: user=${user.id}, message=${dto.message?.slice(0, 50)}`);
    try {
      const { stream, conversationId } = await this.aiService.chat(
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

      let fullContent = '';
      let fullThinking = '';
      let toolCalls: any[] = [];
      const aiService = this.aiService;
      const searchService = this.searchService;

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
              // Accumulate tool_calls from the stream
              const deltaToolCalls = json.choices?.[0]?.delta?.tool_calls;
              if (deltaToolCalls) {
                for (const tc of deltaToolCalls) {
                  const idx = tc.index ?? toolCalls.length;
                  if (!toolCalls[idx]) {
                    toolCalls[idx] = { id: tc.id || '', type: 'function', function: { name: '', arguments: '' } };
                  }
                  if (tc.id) toolCalls[idx].id = tc.id;
                  if (tc.function?.name) toolCalls[idx].function.name += tc.function.name;
                  if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
                }
              }
            } catch {}
          }
        }

        // Handle web search tool calls
        if (dto.webSearch && toolCalls.length > 0 && fullContent.trim() === '') {
          const searchResults: any[] = [];

          for (const tc of toolCalls) {
            if (tc.function?.name === 'web_search') {
              try {
                const args = JSON.parse(tc.function.arguments);
                const query = args.query || dto.message;
                const results = await searchService.search(query, 5);
                searchResults.push(...results);
              } catch (e) {
                this.logger.error('Search execution failed', e);
              }
            }
          }

          // Send search results to client
          if (searchResults.length > 0) {
            res.write(`data: ${JSON.stringify({ type: 'search', searchResults, conversationId })}\n\n`);
            if (typeof res.flush === 'function') res.flush();
          }

          // Build tool result message for re-calling model
          const toolMessages: any[] = [
            ...toolCalls.map((tc: any) => ({
              role: 'assistant',
              content: null,
              tool_calls: [{ id: tc.id, type: 'function', function: { name: tc.function.name, arguments: tc.function.arguments } }],
            })),
            {
              role: 'tool',
              tool_call_id: toolCalls[0].id,
              content: JSON.stringify(searchResults),
            },
          ];

          // Re-call model with tool results (non-streaming for simplicity, then stream the text)
          const model = dto.thinkingEnabled ? 'deepseek-ai/DeepSeek-R1' : 'deepseek-ai/DeepSeek-V3.2';
          const reResponse = await fetch(`https://api.siliconflow.cn/v1/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.ANTHROPIC_API_KEY}`,
            },
            body: JSON.stringify({
              model,
              max_tokens: 1024,
              stream: true,
              messages: [
                ...toolMessages,
                { role: 'user', content: dto.message },
              ],
            }),
          });

          if (reResponse.ok && reResponse.body) {
            fullContent = '';
            const reReader = reResponse.body.getReader();
            let reBuffer = '';

            while (true) {
              const { done, value } = await reReader.read();
              if (done) break;

              reBuffer += decoder.decode(value, { stream: true });
              const reLines = reBuffer.split('\n');
              reBuffer = reLines.pop() || '';

              for (const line of reLines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data: ')) continue;
                const payload = trimmed.slice(6);
                if (payload === '[DONE]') continue;

                try {
                  const json = JSON.parse(payload);
                  const content = json.choices?.[0]?.delta?.content;
                  if (content) {
                    fullContent += content;
                    res.write(`data: ${JSON.stringify({ type: 'chunk', chunk: content, conversationId })}\n\n`);
                    if (typeof res.flush === 'function') res.flush();
                  }
                } catch {}
              }
            }
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
    } catch (error) {
      this.logger.error('AI chat 失败', error?.stack || error);
      // Return plain JSON error, not wrapped by interceptor
      if (!res.headersSent) {
        res.status(500).json({ code: 500, message: 'AI 服务暂时不可用' });
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
