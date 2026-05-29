import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrackEventDto } from './dto/track-event.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  async trackEvent(userId: number | null, dto: TrackEventDto) {
    try {
      return await this.prisma.trackEvent.create({
        data: {
          userId,
          eventType: dto.eventType,
          eventName: dto.eventName,
          properties: dto.properties ?? undefined,
          platform: dto.platform,
          appVersion: dto.appVersion,
          deviceId: dto.deviceId,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to track event: ${error.message}`);
      // Don't throw - analytics should never block the client
      return null;
    }
  }
}
