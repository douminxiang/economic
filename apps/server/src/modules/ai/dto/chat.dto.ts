// apps/server/src/modules/ai/dto/chat.dto.ts
import { IsString, IsOptional, IsNumber, IsBoolean, IsUrl, MinLength, MaxLength } from 'class-validator';

export class ChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @IsNumber()
  conversationId?: number;

  @IsOptional()
  @IsBoolean()
  thinkingEnabled?: boolean;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  webSearch?: boolean;
}
