import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                image: true,
                shopId: true,
                shop: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return { items: [], totalAmount: 0, shopId: null, shopName: null };
    }

    const items = cart.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        price: Number(item.product.price),
        image: item.product.image,
        shopId: item.product.shopId,
        shopName: item.product.shop?.name ?? '',
      },
    }));

    const totalAmount = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );

    const firstItem = items[0];

    return {
      items,
      totalAmount: Math.round(totalAmount * 100) / 100,
      shopId: firstItem?.product.shopId ?? null,
      shopName: firstItem?.product.shopName ?? null,
    };
  }

  async addItem(userId: number, productId: number, quantity: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { shop: { select: { id: true, name: true } } },
    });
    if (!product) throw new BadRequestException('商品不存在');

    // Find or create cart (without items include to keep types simple)
    let cart = await this.prisma.cart.findUnique({ where: { userId } });

    if (cart) {
      // Check if existing items are from a different shop; if so, clear them
      const firstItem = await this.prisma.cartItem.findFirst({
        where: { cartId: cart.id },
        include: { product: { select: { shopId: true } } },
      });
      if (firstItem && firstItem.product.shopId !== product.shopId) {
        await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      }
    } else {
      cart = await this.prisma.cart.create({ data: { userId } });
    }

    const existingItem = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    if (existingItem) {
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity },
      });
    }

    return this.getCart(userId);
  }

  async updateItem(userId: number, itemId: number, quantity: number) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new BadRequestException('购物车为空');

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) throw new BadRequestException('商品不存在');

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: number, itemId: number) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new BadRequestException('购物车为空');

    await this.prisma.cartItem.deleteMany({
      where: { id: itemId, cartId: cart.id },
    });

    return this.getCart(userId);
  }

  async clearCart(userId: number) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    return { items: [], totalAmount: 0, shopId: null, shopName: null };
  }
}
