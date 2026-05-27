import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: {
    orderId: number;
    rating: number;
    tasteRating?: number;
    packRating?: number;
    deliveryRating?: number;
    content?: string;
    images?: string[];
    tags?: string[];
  }) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId, status: 4 },
      include: { review: true },
    });
    if (!order) throw new NotFoundException('订单不存在或状态异常');
    if (order.review) throw new BadRequestException('该订单已评价');

    const review = await this.prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          orderId: dto.orderId,
          userId,
          shopId: order.shopId,
          rating: dto.rating,
          tasteRating: dto.tasteRating,
          packRating: dto.packRating,
          deliveryRating: dto.deliveryRating,
          content: dto.content,
          images: dto.images ?? [],
          tags: dto.tags ?? [],
        },
      });

      const avgResult = await tx.review.aggregate({
        where: { shopId: order.shopId },
        _avg: { rating: true },
      });
      const avgRating = avgResult._avg.rating ?? 5;

      await tx.shop.update({
        where: { id: order.shopId },
        data: { rating: Math.round(avgRating * 10) / 10 },
      });

      return review;
    });

    return review;
  }

  async findByShop(shopId: number, page = 1, limit = 10) {
    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { shopId },
        include: { user: { select: { nickname: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where: { shopId } }),
    ]);

    const mapped = items.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      userId: r.userId,
      userNickname: r.user.nickname ?? '匿名用户',
      userAvatar: r.user.avatar,
      rating: r.rating,
      tasteRating: r.tasteRating,
      packRating: r.packRating,
      deliveryRating: r.deliveryRating,
      content: r.content,
      images: r.images as string[] | null,
      tags: r.tags as string[] | null,
      createdAt: r.createdAt.toISOString(),
    }));

    return { items: mapped, total, page, limit };
  }
}
