// apps/server/src/modules/ai/dto/chat.dto.ts
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class ChatDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsNumber()
  conversationId?: number;
}
