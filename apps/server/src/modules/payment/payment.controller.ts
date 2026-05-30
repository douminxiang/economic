import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('mode')
  getMode() {
    return {
      mockMode: this.paymentService.isMockMode,
      provider: this.paymentService.isMockMode ? 'mock' : 'alipay',
    };
  }

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async handleCallback(@Req() req: Request, @Res() res: Response) {
    const params = (req.body ?? {}) as Record<string, string>;
    const result = await this.paymentService.handleCallback(params);

    if (!result.ok) {
      res.status(HttpStatus.BAD_REQUEST).send('fail');
      return;
    }
    res.send('success');
  }

  @Get('status/:orderNo')
  @UseGuards(JwtAuthGuard)
  async queryStatus(@Param('orderNo') orderNo: string) {
    return this.paymentService.queryPayment(orderNo);
  }

  @Post('mock-pay/:orderNo')
  @UseGuards(JwtAuthGuard)
  async mockPay(@Param('orderNo') orderNo: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNo },
    });
    if (!order || order.status !== 0) {
      return { success: false, message: '订单不存在或状态异常' };
    }

    await this.paymentService.markOrderPaid(orderNo, 'alipay');
    return { success: true, message: '支付成功（模拟）' };
  }

  @Post('sync/:orderNo')
  @UseGuards(JwtAuthGuard)
  async syncPayment(
    @Param('orderNo') orderNo: string,
    @Body() body?: { alipayOutTradeNo?: string },
  ) {
    return this.paymentService.queryPayment(orderNo, body?.alipayOutTradeNo);
  }
}
