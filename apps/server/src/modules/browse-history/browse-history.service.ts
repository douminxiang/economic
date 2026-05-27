import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BrowseHistoryService {
  constructor(private prisma: PrismaService) {}

  async record(userId: number, shopId: number) {
    await this.prisma.browseHistory.upsert({
      where: { userId_shopId: { userId, shopId } },
      update: { createdAt: new Date() },
      create: { userId, shopId },
    });
  }

  async getHistory(userId: number, group: 'today' | 'week' | 'older') {
    const now = new Date();
    let startDate: Date;
    if (group === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (group === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(0);
    }

    return this.prisma.browseHistory.findMany({
      where: { userId, createdAt: { gte: startDate } },
      include: {
        shop: {
          select: { id: true, name: true, images: true, rating: true, minOrder: true, address: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteAll(userId: number) {
    await this.prisma.browseHistory.deleteMany({ where: { userId } });
  }
}
