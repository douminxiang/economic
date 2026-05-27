// apps/server/src/modules/ai/ai.controller.ts
import { Controller, Post, Get, Sse, Body, Param, Logger } from '@nestjs/common';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { MessageEvent } from '@nestjs/common';

@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @Sse('chat')
  async chat(
    @CurrentUser() user: any,
    @Body() dto: ChatDto,
  ): Promise<Observable<MessageEvent>> {
    try {
      const { stream, conversationId } = await this.aiService.chat(
        user.id,
        dto.message,
        dto.conversationId,
      );

      let fullContent = '';

      // Convert Anthropic async iterable stream to Observable<MessageEvent>
      const asyncIterable = {
        async *[Symbol.asyncIterator]() {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const chunk = event.delta.text;
              fullContent += chunk;
              yield { data: JSON.stringify({ chunk, conversationId }) } as MessageEvent;
            }
          }
          // Save full assistant reply to database
          await this.aiService.saveAssistantMessage(conversationId, fullContent);
          // End signal
          yield { data: JSON.stringify({ done: true, conversationId }) } as MessageEvent;
        },
      };

      return from(asyncIterable);
    } catch (error) {
      this.logger.error('AI chat 失败', error);
      return from([{ data: JSON.stringify({ error: error.message }) } as MessageEvent]);
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
