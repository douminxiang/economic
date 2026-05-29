// apps/server/src/modules/ai/ai.controller.ts
import { Controller, Post, Get, Body, Param, Logger, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Readable } from 'stream';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(
    @CurrentUser() user: any,
    @Body() dto: ChatDto,
    @Res({ passthrough: true }) res: any,
  ) {
    try {
      const { stream, conversationId } = await this.aiService.chat(
        user.id,
        dto.message,
        dto.conversationId,
      );

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      let fullContent = '';
      const aiService = this.aiService;

      const readable = new Readable({
        async read() {
          try {
            for await (const event of stream) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                const chunk = event.delta.text;
                fullContent += chunk;
                this.push(`data: ${JSON.stringify({ chunk, conversationId })}\n\n`);
              }
            }
            await aiService.saveAssistantMessage(conversationId, fullContent);
            this.push(`data: ${JSON.stringify({ done: true, conversationId })}\n\n`);
            this.push(null);
          } catch (err: any) {
            console.error('AI stream error:', err?.message || err);
            this.push(`data: ${JSON.stringify({ error: err?.message || 'AI 服务暂时不可用' })}\n\n`);
            this.push(null);
          }
        },
      });

      readable.pipe(res);
    } catch (error) {
      this.logger.error('AI chat 失败', error);
      res.status(500).json({ code: 500, message: 'AI 服务暂时不可用' });
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
