import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import { TrackEventDto } from './dto/track-event.dto';

@Controller('events')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('track')
  @UseGuards(OptionalJwtAuthGuard)
  track(
    @CurrentUser('id') userId: number | undefined,
    @Body() dto: TrackEventDto,
  ) {
    return this.analyticsService.trackEvent(userId ?? null, dto);
  }
}
