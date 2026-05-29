import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import { EventsGateway } from '../events/events.gateway';

const STATUS_TEXT: Record<number, string> = {
  0: '待支付',
  1: '已支付',
  2: '准备中',
  3: '配送中',
  4: '已完成',
  5: '已取消',
};

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  private riderLocationIntervals = new Map<number, ReturnType<typeof setInterval>>();

  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
    private eventsGateway: EventsGateway,
  ) {}

  private generateOrderNo(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${date}${rand}`;
  }

  private async emitStatusChange(orderId: number, userId: number, status: number) {
    try {
      const orderNo = (await this.prisma.order.findUnique({ where: { id: orderId } }))?.orderNo || '';
      this.eventsGateway.emitOrderStatusChanged(userId, {
        orderId,
        orderNo,
        status,
        statusText: STATUS_TEXT[status] || '未知状态',
      });

      // Start simulated rider location tracking when status changes to delivering (3)
      if (status === 3) {
        this.startRiderLocationSimulation(orderId);
      }
    } catch (err) {
      this.logger.error(`Failed to emit status change for order ${orderId}`, err);
    }
  }

  private startRiderLocationSimulation(orderId: number) {
    // Clear any existing interval for this order
    this.stopRiderLocationSimulation(orderId);

    let elapsed = 0;
    const maxDuration = 30 * 60; // 30 minutes in seconds
    const interval = 5000; // 5 seconds

    // Simulate rider starting from a fixed location near Hangzhou center
    const startLat = 30.2741;
    const startLng = 120.1551;

    const timer = setInterval(() => {
      elapsed += interval / 1000;
      if (elapsed >= maxDuration) {
        this.stopRiderLocationSimulation(orderId);
        return;
      }

      // Simulate movement: slowly drift toward destination
      const progress = elapsed / maxDuration;
      const latitude = startLat + progress * 0.02;
      const longitude = startLng - progress * 0.01;
      const estimatedMinutes = Math.max(0, Math.ceil((maxDuration - elapsed) / 60));

      this.eventsGateway.emitRiderLocation(orderId, {
        latitude,
        longitude,
        estimatedMinutes,
      });
    }, interval);

    this.riderLocationIntervals.set(orderId, timer);
  }

  private stopRiderLocationSimulation(orderId: number) {
    const timer = this.riderLocationIntervals.get(orderId);
    if (timer) {
      clearInterval(timer);
      this.riderLocationIntervals.delete(orderId);
    }
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

    const order = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
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

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return order;
    });

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

    // Create payment via PaymentService
    const paymentResult = await this.paymentService.createPayment(
      order.orderNo,
      Number(order.payAmount),
      `订单-${order.orderNo}`,
    );

    // If mock mode or direct pay, update order immediately
    if (paymentResult.mockMode) {
      await this.prisma.order.update({
        where: { id },
        data: { status: 1, payMethod, payTime: new Date() },
      });
      // Emit status change: paid (1)
      await this.emitStatusChange(id, userId, 1);
    }

    return {
      ...order,
      payMethod,
      payUrl: paymentResult.payUrl,
      mockMode: paymentResult.mockMode,
    };
  }

  async cancel(userId: number, id: number) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId, status: 0 },
    });
    if (!order) throw new NotFoundException('订单不存在或状态异常');

    await this.prisma.order.update({
      where: { id },
      data: { status: 5 },
    });

    // Emit status change: cancelled (5)
    await this.emitStatusChange(id, userId, 5);
    this.stopRiderLocationSimulation(id);

    return { id, status: 5 };
  }

  async confirm(userId: number, id: number) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId, status: 3 },
    });
    if (!order) throw new NotFoundException('订单不存在或状态异常');

    await this.prisma.order.update({
      where: { id },
      data: { status: 4 },
    });

    // Emit status change: completed (4)
    await this.emitStatusChange(id, userId, 4);
    this.stopRiderLocationSimulation(id);

    return { id, status: 4 };
  }
}
