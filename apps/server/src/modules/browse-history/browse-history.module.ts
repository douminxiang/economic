import { Module } from '@nestjs/common';
import { BrowseHistoryController } from './browse-history.controller';
import { BrowseHistoryService } from './browse-history.service';

@Module({
  controllers: [BrowseHistoryController],
  providers: [BrowseHistoryService],
})
export class BrowseHistoryModule {}
