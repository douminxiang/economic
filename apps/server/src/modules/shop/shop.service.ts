import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryShopDto } from './dto/query-shop.dto';

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
