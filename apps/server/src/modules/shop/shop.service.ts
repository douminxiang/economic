import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryShopDto } from './dto/query-shop.dto';
import { QueryNearbyDto } from './dto/query-nearby.dto';

@Injectable()
export class ShopService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryShopDto) {
    const { page = 1, limit = 20, categoryId, keyword, sort = 'recommended' } = query;
    const skip = (page - 1) * limit;

    const where: any = { status: 1 };
    if (categoryId) where.categoryId = categoryId;
    if (keyword) where.name = { contains: keyword };

    const orderBy: any =
      sort === 'rating' ? { rating: 'desc' } :
      sort === 'sales' ? { monthlySales: 'desc' } :
      [{ rating: 'desc' }, { monthlySales: 'desc' }];

    const [items, total] = await Promise.all([
      this.prisma.shop.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { category: { select: { name: true } } },
      }),
      this.prisma.shop.count({ where }),
    ]);

    return {
      items: items.map((s) => ({
        ...s,
        categoryName: s.category?.name ?? null,
        category: undefined,
      })),
      total,
      page,
      limit,
    };
  }

  async findRecommended() {
    return this.findAll({ page: 1, limit: 20, sort: 'recommended' });
  }

  async findNearby(query: QueryNearbyDto) {
    const { latitude, longitude, radius = 3000, limit = 20 } = query;

    // Haversine formula for distance calculation
    const R = 6371000; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const shops = await this.prisma.shop.findMany({
      where: { status: 1 },
      include: { category: { select: { name: true } } },
    });

    const shopsWithDistance = shops
      .map((shop) => {
        const dLat = toRad(Number(shop.latitude) - latitude);
        const dLng = toRad(Number(shop.longitude) - longitude);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(latitude)) *
            Math.cos(toRad(Number(shop.latitude))) *
            Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return {
          ...shop,
          categoryName: shop.category?.name ?? null,
          category: undefined,
          distance: Math.round(distance),
        };
      })
      .filter((shop) => shop.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return { items: shopsWithDistance, total: shopsWithDistance.length };
  }

  async findOne(id: number) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: {
        category: { select: { name: true } },
        products: {
          where: { status: 1 },
          orderBy: { sales: 'desc' },
        },
      },
    });
    if (!shop) throw new NotFoundException('商家不存在');

    const productMap = new Map<string, any[]>();
    for (const p of shop.products) {
      const catName = '商品';
      if (!productMap.has(catName)) productMap.set(catName, []);
      productMap.get(catName)!.push(p);
    }

    return {
      ...shop,
      categoryName: shop.category?.name ?? null,
      category: undefined,
      products: Array.from(productMap.entries()).map(([categoryName, products]) => ({
        categoryName,
        products,
      })),
    };
  }
}
