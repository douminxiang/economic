import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { EmbeddingService } from './embedding.service';
import { SearchService } from './search.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [AiController],
  providers: [AiService, EmbeddingService, SearchService],
})
export class AiModule {}
