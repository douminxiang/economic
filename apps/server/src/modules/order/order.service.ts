import { Injectable, BadRequestException, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
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
export class OrderService implements OnModuleInit {
  private readonly logger = new Logger(OrderService.name);
  private riderLocationIntervals = new Map<number, ReturnType<typeof setInterval>>();
  private autoAdvanceTimers = new Map<number, ReturnType<typeof setTimeout>[]>();

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

  async onModuleInit() {
    const inProgress = await this.prisma.order.findMany({
      where: { status: { in: [1, 2, 3] } },
      select: { id: true, userId: true, status: true, payTime: true, updatedAt: true },
    });

    for (const order of inProgress) {
      if (order.status === 3) {
        this.startRiderLocationSimulation(order.id);
      } else {
        this.resumeAutoAdvance(order.id, order.userId, order.status, order.payTime ?? order.updatedAt);
      }
    }

    if (inProgress.length > 0) {
      this.logger.log(`Resumed fulfillment for ${inProgress.length} in-progress order(s)`);
    }
  }

  /** Recover auto-advance timers after server restart (dev hot-reload). */
  private resumeAutoAdvance(
    orderId: number,
    userId: number,
    currentStatus: number,
    paidAt: Date,
  ) {
    const elapsedMs = Date.now() - paidAt.getTime();
    const preparingAt = 3000;
    const deliveringAt = 8000;

    if (currentStatus === 1) {
      if (elapsedMs >= deliveringAt) {
        void this.advanceOrderStatus(orderId, userId, 3);
        return;
      }
      if (elapsedMs >= preparingAt) {
        void this.advanceOrderStatus(orderId, userId, 2);
        const delay = deliveringAt - elapsedMs;
        const toDelivering = setTimeout(() => {
          void this.advanceOrderStatus(orderId, userId, 3);
        }, delay);
        this.autoAdvanceTimers.set(orderId, [toDelivering]);
        return;
      }
      this.scheduleAutoAdvanceWithDelay(orderId, userId, preparingAt - elapsedMs, deliveringAt - elapsedMs);
      return;
    }

    if (currentStatus === 2) {
      if (elapsedMs >= deliveringAt) {
        void this.advanceOrderStatus(orderId, userId, 3);
        return;
      }
      const delay = deliveringAt - elapsedMs;
      const toDelivering = setTimeout(() => {
        void this.advanceOrderStatus(orderId, userId, 3);
      }, delay);
      this.autoAdvanceTimers.set(orderId, [toDelivering]);
    }
  }

  private scheduleAutoAdvanceWithDelay(
    orderId: number,
    userId: number,
    preparingDelayMs: number,
    deliveringDelayMs: number,
  ) {
    this.clearAutoAdvance(orderId);

    const toPreparing = setTimeout(() => {
      void this.advanceOrderStatus(orderId, userId, 2);
    }, Math.max(0, preparingDelayMs));

    const toDelivering = setTimeout(() => {
      void this.advanceOrderStatus(orderId, userId, 3);
    }, Math.max(0, deliveringDelayMs));

    this.autoAdvanceTimers.set(orderId, [toPreparing, toDelivering]);
  }

  /** Called by PaymentService after successful payment (mock or callback). */
  async markPaidFromPayment(orderNo: string, payMethod: string) {
    const order = await this.prisma.order.findUnique({ where: { orderNo } });
    if (!order || order.status !== 0) return;

    await this.prisma.order.update({
      where: { orderNo },
      data: { status: 1, payMethod, payTime: new Date() },
    });
    await this.emitStatusChange(order.id, order.userId, 1);
  }

  /** Ensure rider location simulation is running for a delivering order. */
  ensureRiderSimulation(orderId: number) {
    if (this.riderLocationIntervals.has(orderId)) return;
    this.prisma.order
      .findUnique({ where: { id: orderId }, select: { status: true } })
      .then((order) => {
        if (order?.status === 3) {
          this.startRiderLocationSimulation(orderId);
        }
      })
      .catch((err) => this.logger.warn(`ensureRiderSimulation failed for order ${orderId}`, err));
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

      if (status === 1) {
        this.scheduleAutoAdvance(orderId, userId);
      }
      if (status === 3) {
        this.startRiderLocationSimulation(orderId);
      }
      if (status === 4 || status === 5) {
        this.clearAutoAdvance(orderId);
        this.stopRiderLocationSimulation(orderId);
      }
    } catch (err) {
      this.logger.error(`Failed to emit status change for order ${orderId}`, err);
    }
  }

  private scheduleAutoAdvance(orderId: number, userId: number) {
    this.scheduleAutoAdvanceWithDelay(orderId, userId, 3000, 8000);
  }

  private clearAutoAdvance(orderId: number) {
    const timers = this.autoAdvanceTimers.get(orderId);
    if (timers) {
      timers.forEach(clearTimeout);
      this.autoAdvanceTimers.delete(orderId);
    }
  }

  private async advanceOrderStatus(orderId: number, userId: number, targetStatus: number) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order || order.status >= targetStatus || order.status === 4 || order.status === 5) {
      return;
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: targetStatus },
    });
    await this.emitStatusChange(orderId, userId, targetStatus);
  }

  private startRiderLocationSimulation(orderId: number) {
    this.stopRiderLocationSimulation(orderId);

    const interval = 2000; // 2 秒推送一次，便于演示
    const startLat = 30.2741;
    const startLng = 120.1551;
    let progress = 0;

    const emitLocation = () => {
      const latitude = startLat + progress * 0.02;
      const longitude = startLng - progress * 0.01;
      const estimatedMinutes = Math.max(0, Math.ceil((1 - progress) * 30));

      this.eventsGateway.emitRiderLocation(orderId, {
        latitude,
        longitude,
        estimatedMinutes,
      });
    };

    emitLocation();

    const timer = setInterval(() => {
      progress = Math.min(1, progress + 0.04);
      emitLocation();
      if (progress >= 1) {
        this.stopRiderLocationSimulation(orderId);
      }
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
          shop: { select: { name: true, latitude: true, longitude: true, address: true } },
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
        shop: { select: { name: true, latitude: true, longitude: true, address: true } },
      },
    });
    if (!order) throw new NotFoundException('订单不存在');

    return {
      ...order,
      shopName: order.shop.name,
      shop: {
        name: order.shop.name,
        address: order.shop.address,
        latitude: order.shop.latitude != null ? Number(order.shop.latitude) : null,
        longitude: order.shop.longitude != null ? Number(order.shop.longitude) : null,
      },
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

    const normalizedMethod = payMethod === 'alipay' ? 'alipay' : payMethod;

    // 微信/银联暂用 mock 即时支付
    if (normalizedMethod !== 'alipay' || this.paymentService.isMockMode) {
      const paymentResult = await this.paymentService.createPayment(
        order.orderNo,
        Number(order.payAmount),
        `订单-${order.orderNo}`,
      );

      if (paymentResult.mockMode) {
        await this.prisma.order.update({
          where: { id },
          data: { status: 1, payMethod: normalizedMethod, payTime: new Date() },
        });
        await this.emitStatusChange(id, userId, 1);
      }

      return {
        orderNo: order.orderNo,
        alipayOutTradeNo: paymentResult.alipayOutTradeNo,
        payMethod: normalizedMethod,
        payUrl: paymentResult.payUrl,
        mockMode: paymentResult.mockMode,
      };
    }

    await this.prisma.order.update({
      where: { id },
      data: { payMethod: 'alipay' },
    });

    const paymentResult = await this.paymentService.createPayment(
      order.orderNo,
      Number(order.payAmount),
      `订单-${order.orderNo}`,
    );

    return {
      orderNo: order.orderNo,
      alipayOutTradeNo: paymentResult.alipayOutTradeNo,
      payMethod: 'alipay',
      payUrl: paymentResult.payUrl,
      payFormHtml: paymentResult.payFormHtml,
      sandboxReady: paymentResult.sandboxReady,
      mockMode: false,
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

    await this.emitStatusChange(id, userId, 5);

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

    await this.emitStatusChange(id, userId, 4);

    return { id, status: 4 };
  }
}
