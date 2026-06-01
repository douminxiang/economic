import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, OptionalJwtAuthGuard],
})
export class AnalyticsModule {}
