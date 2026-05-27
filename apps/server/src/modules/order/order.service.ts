import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  private generateOrderNo(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${date}${rand}`;
  }

  async create(userId: number, addressId: number, remark?: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true, name: true, price: true, image: true,
                shopId: true, stock: true,
                shop: { select: { name: true, deliveryFee: true } },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('购物车为空');
    }

    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) throw new BadRequestException('地址不存在');

    const shopId = cart.items[0].product.shopId;
    const shop = cart.items[0].product.shop;

    let totalAmount = 0;
    const orderItems = cart.items.map((item) => {
      const price = Number(item.product.price);
      totalAmount += price * item.quantity;
      return {
        productId: item.productId,
        name: item.product.name,
        image: item.product.image,
        price: item.product.price,
        quantity: item.quantity,
      };
    });

    const deliveryFee = Number(shop?.deliveryFee ?? 0);
    const packagingFee = 2;
    const payAmount = totalAmount + deliveryFee + packagingFee;

    const order = await this.prisma.order.create({
      data: {
        orderNo: this.generateOrderNo(),
        userId,
        shopId,
        status: 0,
        totalAmount,
        deliveryFee,
        packagingFee,
        payAmount,
        remark,
        addressSnapshot: {
          name: address.name,
          phone: address.phone,
          address: `${address.province}${address.city}${address.district}${address.detail}`,
        },
        items: { create: orderItems },
      },
      include: { items: true },
    });

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    return order;
  }

  async findAll(userId: number, status?: number, page = 1, limit = 10) {
    const where: any = { userId };
    if (status !== undefined) {
      if (status === 1) {
        where.status = { in: [1, 2, 3] };
      } else if (status === 2) {
        where.status = 4;
      } else {
        where.status = status;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: { select: { name: true, image: true, quantity: true } },
          shop: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    const mapped = items.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      shopName: o.shop.name,
      status: o.status,
      payAmount: Number(o.payAmount),
      items: o.items,
      createdAt: o.createdAt.toISOString(),
    }));

    return { items: mapped, total, page, limit };
  }

  async findOne(userId: number, id: number) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: {
        items: true,
        shop: { select: { name: true } },
      },
    });
    if (!order) throw new NotFoundException('订单不存在');

    return {
      ...order,
      shopName: order.shop.name,
      payAmount: Number(order.payAmount),
      totalAmount: Number(order.totalAmount),
      deliveryFee: Number(order.deliveryFee),
      packagingFee: Number(order.packagingFee),
      discountAmount: Number(order.discountAmount),
      items: order.items.map((i) => ({
        ...i,
        price: Number(i.price),
      })),
      createdAt: order.createdAt.toISOString(),
      payTime: order.payTime?.toISOString() ?? null,
    };
  }

  async pay(userId: number, id: number, payMethod: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId, status: 0 },
    });
    if (!order) throw new NotFoundException('订单不存在或状态异常');

    return this.prisma.order.update({
      where: { id },
      data: { status: 1, payMethod, payTime: new Date() },
    });
  }

  async cancel(userId: number, id: number) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId, status: 0 },
    });
    if (!order) throw new NotFoundException('订单不存在或状态异常');

    return this.prisma.order.update({
      where: { id },
      data: { status: 5 },
    });
  }

  async confirm(userId: number, id: number) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId, status: 3 },
    });
    if (!order) throw new NotFoundException('订单不存在或状态异常');

    return this.prisma.order.update({
      where: { id },
      data: { status: 4 },
    });
  }
}
