import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoriteService {
  constructor(private prisma: PrismaService) {}

  async toggle(userId: number, shopId: number) {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_shopId: { userId, shopId } },
    });

    if (existing) {
      await this.prisma.favorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }

    await this.prisma.favorite.create({ data: { userId, shopId } });
    return { favorited: true };
  }

  async findAll(userId: number) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            images: true,
            rating: true,
            monthlySales: true,
            minOrder: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return favorites.map((f) => ({
      id: f.id,
      shopId: f.shop.id,
      shopName: f.shop.name,
      shopImage: Array.isArray(f.shop.images) ? f.shop.images[0] : null,
      rating: Number(f.shop.rating),
      monthlySales: f.shop.monthlySales,
      minOrder: Number(f.shop.minOrder),
      createdAt: f.createdAt.toISOString(),
    }));
  }

  async check(userId: number, shopId: number) {
    const fav = await this.prisma.favorite.findUnique({
      where: { userId_shopId: { userId, shopId } },
    });
    return { favorited: !!fav };
  }
}
