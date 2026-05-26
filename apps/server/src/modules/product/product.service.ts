import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryProductDto } from './dto/query-product.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryProductDto) {
    const { shopId, categoryId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { status: 1 };
    if (shopId) where.shopId = shopId;
    if (categoryId) where.categoryId = categoryId;

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { sales: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        shop: {
          select: {
            name: true,
            address: true,
            rating: true,
            monthlySales: true,
          },
        },
      },
    });
    if (!product) throw new NotFoundException('商品不存在');

    const { shop, ...productData } = product;
    return {
      ...productData,
      shopName: shop?.name ?? null,
      shopAddress: shop?.address ?? null,
      shopRating: shop?.rating ?? null,
      shopMonthlySales: shop?.monthlySales ?? null,
    };
  }
}
